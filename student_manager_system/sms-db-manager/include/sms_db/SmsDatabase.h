/**
 * @file SmsDatabase.h
 * @brief sms database header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_SMSDATABASE_H_
#define DB_MANAGER_INCLUDE_DB_SMSDATABASE_H_

#include "SQLiteCpp/Database.h"
#include "sms_db/SmsDatabaseException.h"
#include "sms_db/SmsColumn.h"
#include "sms_db/SmsStatement.h"
#include "sms_db/SmsTransaction.h"


namespace db_manager {

/**
 * @class open mode
 */
enum SmsOpenMode {
  READ_ONLY = 0x00000001,
  READ_WRITE = 0x00000002,
  CREATE = 0x00000004
};

enum RecordStatus {
  NONE = 0,
  ADDED = 0x00000001,
  DELETED = 0x00000002,
  MODIFIED = 0x00000003
};

/**
 * @class SmsDatabase
 * @brief Sms database implementation
 */
class SmsDatabase {
  // share m_db to SmsStatement
  friend class SmsStatement;

  // share m_db to SmsTransaction
  friend class SmsTransaction;

 public:
  /**
   * @fn
   * InitializeDBPool
   * @brief initialize db pool
   */
  static void InitializeDBPool();

  /**
   * @fn
   * ClearDBPool
   * @brief clear db pool
   */
  static void ClearDBPool();

  /**
   * @fn
   * ReleaseDatabaseFromDBPool
   * @brief release database from db pool
   * @param db_path
   */
  static void ReleaseDatabaseFromDBPool(std::string db_path);

  /**
   * @fn
   * SmsDatabase
   * @brief default constructor
   */
   SmsDatabase();

  /**
   * @fn
   * SmsDatabase
   * @brief constructor
   * @param file_name DB file name
   * @throw Sms_db_manager::SmsDatabaseException in case of error
   */
  explicit SmsDatabase(const char* file_name);
  explicit SmsDatabase(const std::string& file_name);

  /**
   * @fn
   * SmsDatabase
   * @brief constructor
   * @param file_name db file name
   * @param open_mode open mode: READ_ONLY, READ_WRITE, CREATE
   * @throw Sms_db_manager::SmsDatabaseException in case of error
   */
  explicit SmsDatabase(const char* file_name, SmsOpenMode open_mode);
  explicit SmsDatabase(const std::string& file_name, SmsOpenMode open_mode);

  /**
   * @fn
   * SmsDatabase
   * @brief constructor
   * @param file_name db file name
   * @param open_mode open mode: READ_ONLY, READ_WRITE, CREATE
   * @param is_pool : true - use db pool
   * @throw Sms_db_manager::SmsDatabaseException in case of error
   */
  explicit SmsDatabase(const std::string& file_name, SmsOpenMode open_mode, bool is_pool);

  /**
  * @fn
  * SmsDatabase
  * @brief copy constructor
  * @param database other instance
  * @throw Sms_db_manager::SmsDatabaseException in case of error
  */
  SmsDatabase(SmsDatabase& database);

  SmsDatabase& operator=(SmsDatabase& other);

  /**
   * @fn
   * ~SmsDatabase
   * @brief destructor
   */
  ~SmsDatabase();

  /**
   * @fn
   * ExecSQL
   * @brief execute SQL
   * @param sql sql string
   * @return number of rows modified by the *last* INSERT, UPDATE or DELETE
   * statement (beware of multiple statements)
   * @throw Sms_db_manager::SmsException in case of error
   */
  int ExecSQL(const char* sql);

  /**
   * @fn
   * ExecSQL
   * @brief execute SQL
   * @param sql sql string
   * @return number of rows modified by the *last* INSERT, UPDATE or DELETE
   * statement (beware of multiple statements)
   * @throw Sms_db_manager::SmsException in case of error
   */
  int ExecSQL(const std::string& sql);

  /**
   * @fn
   * ExecSQLAndGetColumn
   * @brief execute SQL and get column
   * @param sql sql string
   * @return column
   * @throw Sms_db_manager::SmsException in case of error
   */
  SmsColumn ExecSQLAndGetColumn(const char* sql);

  /**
   * @fn
   * ExecSQLAndGetColumn
   * @brief execute SQL and get column
   * @param sql sql string
   * @return column
   * @throw Sms_db_manager::SmsException in case of error
   */
  SmsColumn ExecSQLAndGetColumn(const std::string& sql);

  /**
   * @fn
   * tableExists
   * @brief confirm existence of table
   * @param table_name table name
   * @return - true exists
   *         - false not exists
   * @throw Sms_db_manager::SmsException in case of error
   */
  bool TableExists(const char* table_name);

  /**
   * @fn
   * tableExists
   * @brief confirm existence of table
   * @param table_name table name
   * @return - true exists
   *         - false not exists
   * @throw Sms_db_manager::SmsException in case of error
   */
  bool TableExists(const std::string& sql);

  /**
   * @fn
   * GetFileName
   * @brief get file name
   * @return file name
   */
  std::string GetFileName() const;

  /**
  * @fn
  * InTransactionMark
  * @brief set in transaction mark
  * @param database path
  * @param in_trans true - start transaction mark : false - end transaction mark
  */
  static void InTransactionMark(std::string db_path, const bool in_trans);

 private:
  // instance of SQLite Database
  SQLite::Database *m_db;
  bool m_pool;
};

}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_SMSDATABASE_H_
