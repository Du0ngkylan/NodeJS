/**
 * @file SmsDatabase.cc
 * @brief sms database implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <iostream>
#include <vector>
#include <set>
#include "sms_db/SmsDatabase.h"
#include "SQLiteCpp/Exception.h"
#include "sms_db/SmsColumn.h"


namespace db_manager {

// internal database pool
static std::map<std::string, SQLite::Database*> db_pool;
// list used for discard decision
static std::vector<std::string> db_recently;
// transaction marking databases
static std::set<std::string> tran_dbs;
// cache_size * page_size = max memory of 1db 
const int POOL_SIZE = 20;
// assign timeout to all databases
const int DEF_TIMEOUT = 30000;

/*
 * ----------------------------------------
 * Database connection pool overview
 * ----------------------------------------
 *
 *  Keep a certain number of database connections.
 *  Basically, connection management uses Least Recently Used (LRU).
 * 
 *  Important)
 *   The maximum number of connections is POOL_SIZE
 *   When transaction processing is performed to all open dbs, the next db can not be opened
 *   Use InTransactionMark for marking transaction processing
 * ------------ Note ------------
 * 
 * 1.open db1
 *  +-----+-----+-----+
 *  | db1 |     |     |
 *  +-----+-----+-----+
 * 2.open db2
 *  +-----+-----+-----+
 *  | db1 | db2 |    |
 *  +-----+-----+-----+
 * 3.open db3 (max connection)
 *  +-----+-----+-----+
 *  | db1 | db2 | db3 |
 *  +-----+-----+-----+
 * 4.open db4 (connection limit exceed)
 *  close db1
 *  +-----+-----+-----+
 *  | db2 | db3 | db4 |
 *  +-----+-----+-----+
 * 
 *  However, database during transaction processing stays retained.
 * 
 * 1.open db1
 *  +--------+--------+-------+
 *  | db1    |        |       |
 *  +--------+--------+-------+
 * 2.open db2
 *  +--------+--------+-------+
 *  | db1    | db2    |       |
 *  +--------+--------+-------+
 * 3.begin transaction (db1)
 *  +--------+--------+-------+
 *  | db1(t) | db2    |       |
 *  +--------+--------+-------+
 * 3.open db3 (max connection)
 *  +--------+--------+-------+
 *  | db1(t) | db2    | db3   |
 *  +--------+--------+-------+
 * 4.open db4 (connection limit exceed)
 *  close db2
 *  since db1 is in a transaction, it does not close the connection.
 *  +--------+--------+-------+
 *  | db3    | db1(t) | db4   |
 *  +--------+--------+-------+
 */

/**
 * @fn
 * InitializeDBPool
 * @brief initialize db pool
 */
void SmsDatabase::InitializeDBPool() {
  // do nothing
}

/**
 * @fn
 * ClearDBPool
 * @brief clear db pool
 */
void SmsDatabase::ClearDBPool() {
  std::map<std::string, SQLite::Database*>::iterator it;
  for ( it = db_pool.begin(); it != db_pool.end(); it++ ) {
    delete it->second;
  }
  db_pool.clear();
  db_recently.clear();
  tran_dbs.clear();
}

/**
 * @fn
 * ReleaseDatabaseFromDBPool
 * @brief release database from pool
 * @param db_path
 */
void SmsDatabase::ReleaseDatabaseFromDBPool(std::string db_path) {
  if (db_pool.count(db_path) == 1) {
    auto d = db_pool[db_path];
    delete d;
    db_pool.erase(db_path);

    auto p = find(db_recently.begin(), db_recently.end(), db_path);
    if (p != db_recently.end()) {
      db_recently.erase(p);
    }

    if (tran_dbs.count(db_path) == 1) {
      tran_dbs.erase(db_path);
    }
  }
}

/**
 * @fn
 * GetDB
 * @brief get db from db pool
 * @param db_path
 * @param open_mode
 */
inline SQLite::Database *GetDB(std::string db_path, const int open_mode) {
  // memory db does not pool 
  if (db_path == ":memory:") {
    return new SQLite::Database(db_path, open_mode);
  }

  // exist in pool?
  if (db_pool.count(db_path) == 1) {
    auto p = find(db_recently.begin(), db_recently.end(), db_path);
    db_recently.erase(p);
    db_recently.push_back(db_path);
    return db_pool[db_path];
  }

  // release database that has not been recently accessed
  if (db_pool.size() >= POOL_SIZE) {
    // is transaction?
    bool release = false;
    for (int i = 0; i < POOL_SIZE; i++) {
      auto &p = db_recently.begin();
      std::string path = *p;
      if (tran_dbs.count(path) == 0) {
        SmsDatabase::ReleaseDatabaseFromDBPool(path);
        release = true;
        break;
      } else {
        db_recently.erase(p);
        db_recently.push_back(path);
      }
    }
    if (!release) {
      throw SmsDatabaseException("all databases are in transaction.");
    }
  }
  db_recently.push_back(db_path);

  db_pool[db_path] = new SQLite::Database(db_path, open_mode);
  db_pool[db_path]->setBusyTimeout(DEF_TIMEOUT);
  return db_pool[db_path];
}

/**
* @fn
* InTransactionMark
* @brief set in transaction mark
* @param database path
* @param in_trans true - start transaction mark : false - end transaction mark
*/
void SmsDatabase::InTransactionMark(std::string db_path, const bool in_trans) {
  if (in_trans) {
    tran_dbs.insert(db_path);
  } else {
    auto p = find(tran_dbs.begin(), tran_dbs.end(), db_path);
    if (p != tran_dbs.end()) {
      tran_dbs.erase(p);
    }
  }
}

/**
* @fn
* SmsDatabase
* @brief default constructor
*/
SmsDatabase::SmsDatabase() {
  m_db = nullptr;
}

/**
 * @fn
 * SmsDatabase
 * @brief constructor
 * @param file_name DB file name
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
SmsDatabase::SmsDatabase(const char *file_name) {
  try {
    m_pool = false;
    m_db = new SQLite::Database(std::string(file_name), SQLite::OPEN_READONLY);
    m_db->setBusyTimeout(DEF_TIMEOUT);
  } catch (SQLite::Exception) {
    throw SmsDatabaseException("Not found " + std::string(file_name));
  }
}

SmsDatabase::SmsDatabase(const std::string &file_name) {
  try {
    m_pool = false;
    m_db = new SQLite::Database(file_name, SQLite::OPEN_READONLY);
    m_db->setBusyTimeout(DEF_TIMEOUT);
  } catch (SQLite::Exception) {
    throw SmsDatabaseException("Not found " + file_name);
  }
}

/**
 * @fn
 * SmsDatabase
 * @brief constructor
 * @param file_name db file name
 * @param open_mode open mode: READ_ONLY, READ_WRITE, CREATE
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
SmsDatabase::SmsDatabase(const char *file_name, SmsOpenMode open_mode) {
  try {
    m_pool = false;
    m_db = new SQLite::Database(std::string(file_name), open_mode);
    m_db->setBusyTimeout(DEF_TIMEOUT);
  } catch (SQLite::Exception) {
    throw SmsDatabaseException("Not found " + std::string(file_name));
  }
}

SmsDatabase::SmsDatabase(const std::string &file_name, SmsOpenMode open_mode) {
  try {
    m_pool = false;
    m_db = new SQLite::Database(file_name, open_mode);
    m_db->setBusyTimeout(DEF_TIMEOUT);
  } catch (SQLite::Exception) {
    throw SmsDatabaseException("Not found " + file_name);
  }
}

/**
 * @fn
 * SmsDatabase
 * @brief constructor
 * @param file_name db file name
 * @param open_mode open mode: READ_ONLY, READ_WRITE, CREATE
 * @param is_pool : true - use db pool
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
SmsDatabase::SmsDatabase(const std::string &file_name, SmsOpenMode open_mode, bool is_pool) {
  try {
    m_pool = is_pool;
    if (m_pool) {
      m_db = GetDB(file_name, open_mode);
    } else {
      m_db = new SQLite::Database(file_name, open_mode);
      m_db->setBusyTimeout(DEF_TIMEOUT);
    }
  } catch (SQLite::Exception) {
    throw SmsDatabaseException("Not found " + file_name);
  }
}

/**
* @fn
* SmsDatabase
* @brief copy constructor
* @param database other instance
* @throw Sms_db_manager::SmsDatabaseException in case of error
*/
SmsDatabase::SmsDatabase(SmsDatabase& database) {
  m_db = database.m_db;
  m_pool = database.m_pool;
  database.m_db = nullptr;
}

SmsDatabase& SmsDatabase::operator=(SmsDatabase& other) {
  m_db = other.m_db;
  m_pool = other.m_pool;
  other.m_db = nullptr;
  return *this;
}

#pragma optimize("", off)
/**
 * @fn
 * ~SmsDatabase
 * @brief destructor
 */
SmsDatabase::~SmsDatabase() {
  if (m_db != nullptr) {
    if (GetFileName() == ":memory:" || m_pool == false) {
      delete m_db;
    }
  }
}
#pragma optimize("", on)

/**
 * @fn
 * ExecSQL
 * @brief execute SQL
 * @param sql sql string
 * @return number of rows modified by the *last* INSERT, UPDATE or DELETE
 * statement (beware of multiple statements)
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
int SmsDatabase::ExecSQL(const char *sql) {
  try {
    return m_db->exec(sql);
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * ExecSQL
 * @brief execute SQL
 * @param sql sql string
 * @return number of rows modified by the *last* INSERT, UPDATE or DELETE
 * statement (beware of multiple statements)
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
int SmsDatabase::ExecSQL(const std::string &sql) {
  try {
    return m_db->exec(sql.c_str());
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * ExecSQLAndGetColumn
 * @brief execute SQL and get column
 * @param sql sql string
 * @return column
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
SmsColumn SmsDatabase::ExecSQLAndGetColumn(const char *sql) {
  try {
    return SmsColumn(m_db->execAndGet(sql));
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * ExecSQLAndGetColumn
 * @brief execute SQL and get column
 * @param sql sql string
 * @return column
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
SmsColumn SmsDatabase::ExecSQLAndGetColumn(const std::string &sql) {
  try {
    return SmsColumn(m_db->execAndGet(sql.c_str()));
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * TableExists
 * @brief confirm existence of table
 * @param table_name table name
 * @return true - exists : false - not exists
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
bool SmsDatabase::TableExists(const char *table_name) {
  try {
    return m_db->tableExists(table_name);
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * TableExists
 * @brief confirm existence of table
 * @param table_name table name
 * @return true - exists : false - not exists
 * @throw Sms_db_manager::SmsDatabaseException in case of error
 */
bool SmsDatabase::TableExists(const std::string &table_name) {
  try {
    return m_db->tableExists(table_name.c_str());
  } catch (SQLite::Exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetFileName
 * @brief get file name
 * @return file name
 */
std::string SmsDatabase::GetFileName() const {
  return m_db->getFilename();
}

}  // namespace db_manager