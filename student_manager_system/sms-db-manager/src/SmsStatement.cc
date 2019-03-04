/**
 * @file SmsStatement.cc
 * @brief sms statement implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/SmsStatement.h"
#include "sms_db/SmsColumn.h"

namespace db_manager {

/**
 * @fn
 * SmsStatement
 * @brief constructor
 * @param database SmsDatabase
 * @param query SQL query string
 */
SmsStatement::SmsStatement(SmsDatabase& database, const char* query)
  : m_statement(*database.m_db, query) {}

SmsStatement::SmsStatement(SmsDatabase& database, const std::string& query)
  : m_statement(*database.m_db, query.c_str()) {}

/**
 * @fn
 * ~SmsStatement
 * @brief destructor
 */
SmsStatement::~SmsStatement() {
  try {
    m_statement.reset();
  } catch (SQLite::Exception) {
    // avoid reset errors
  }
}

/**
 * @fn
 * Reset
 * @brief reset the statement to make it ready for a new execution.
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::Reset() {
  try {
    m_statement.reset();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * ClearBindings
 * @brief clears away all the bindings of a prepared statement.
 *  Contrary to the intuition of many, reset() does not reset the bindings on
 * a prepared statement. Use this routine to reset all parameters to NULL.
 */
void SmsStatement::ClearBindings() {
  try {
    m_statement.clearBindings();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * Bind
 * @brief bind a value to a parameter of the SQL statement.
 * @param column_index column index
 * @param value       value
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::Bind(const int column_index, const int value) {
  try {
    m_statement.bind(column_index, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const int column_index, const std::string& value) {
  try {
    m_statement.bind(column_index, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const int column_index, const char* value) {
  try {
    m_statement.bind(column_index, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const int column_index, const long long value) {
  try {
    m_statement.bind(column_index, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const int column_index, const double value) {
  try {
    m_statement.bind(column_index, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * Bind
 * @brief bind a value to a parameter of the SQL statement.
 * @param column_index column index
 * @param value       value
 * @param value_size   value size
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::Bind(const int column_index, const void* value,
                         const int value_size) {
  try {
    m_statement.bind(column_index, value, value_size);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * BindNull
 * @brief bind a null to a parameter of the SQL statement.
 * @param column_index column index
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::BindNull(const int column_index) {
  try {
    m_statement.bind(column_index);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * Bind
 * @brief bind a value to a parameter of the SQL statement.
 * @param column_name column name
 * @param value       value
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::Bind(const char* column_name, const int value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const char* column_name, const std::string& value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const char* column_name, const char* value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const char* column_name, const long long value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const char* column_name, const double value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name, const int value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name,
                         const std::string& value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name, const char* value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name,
                         const long long value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name, const double value) {
  try {
    m_statement.bind(column_name, value);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * Bind
 * @brief bind a value to a parameter of the SQL statement.
 * @param column_name column name
 * @param value       value
 * @param value_size   value size
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::Bind(const char* column_name, const void* value,
                         const int value_size) {
  try {
    m_statement.bind(column_name, value, value_size);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::Bind(const std::string& column_name, const void* value,
                         const int value_size) {
  try {
    m_statement.bind(column_name, value, value_size);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * BindNull
 * @brief bind a null to a parameter of the SQL statement.
 * @param column_name column name
 * @throw db_manager::SmsDatabaseException in case of error
 */
void SmsStatement::BindNull(const char* column_name) {
  try {
    m_statement.bind(column_name);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

void SmsStatement::BindNull(const std::string& column_name) {
  try {
    m_statement.bind(column_name.c_str());
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * ExecuteStep
 * @brief execute a step of the prepared query to fetch one row of results.
 * @return - true if there is another row ready
 *         - false if the query has finished executing
 * @throw db_manager::SmsDatabaseException in case of error
 */
bool SmsStatement::ExecuteStep() {
  try {
    return m_statement.executeStep();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * Execute
 * @brief execute a one-step query with no expected result.
 * @throw db_manager::SmsDatabaseException in case of error
 */
int SmsStatement::Execute() {
  try {
    return m_statement.exec();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetColumn
 * @brief return a copy of the column data specified by its index
 * @param column_index column index
 * @return - column
 * @throw db_manager::SmsDatabaseException in case of error
 */
SmsColumn SmsStatement::GetColumn(const int column_index) {
  try {
    SQLite::Column col = m_statement.getColumn(column_index);
    return SmsColumn(col);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetColumn
 * @brief return a copy of the column data specified by its name
 * @param column_name column name
 * @return - column
 * @throw db_manager::SmsDatabaseException in case of error
 */
SmsColumn SmsStatement::GetColumn(const char* column_name) {
  try {
    return SmsColumn(m_statement.getColumn(column_name));
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

SmsColumn SmsStatement::GetColumn(const std::string& column_name) {
  try {
    return SmsColumn(m_statement.getColumn(column_name.c_str()));
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * IsColumnNull
 * @brief test if the column value is NULL
 * @param column_index column index
 * @return - true NULL
 *         - false not NULL
 * @throw db_manager::SmsDatabaseException in case of error
 */
bool SmsStatement::IsColumnNull(const int column_index) {
  try {
    return m_statement.isColumnNull(column_index);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * IsColumnNull
 * @brief test if the column value is NULL
 * @param column_name column name
 * @return - true NULL
 *         - false not NULL
 * @throw db_manager::SmsDatabaseException in case of error
 */
bool SmsStatement::IsColumnNull(const char* column_name) {
  try {
    return m_statement.isColumnNull(column_name);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

bool SmsStatement::IsColumnNull(const std::string& column_name) {
  try {
    return m_statement.isColumnNull(column_name.c_str());
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetColumnName
 * @brief return the column name
 * @param column_index column index
 * @return - column name
 * @throw db_manager::SmsDatabaseException in case of error
 */
const char* SmsStatement::GetColumnName(const int column_index) {
  try {
    return m_statement.getColumnName(column_index);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetColumnIndex
 * @brief return the column index
 * @param column_name column name
 * @return - column index
 * @throw db_manager::SmsDatabaseException in case of error
 */
int SmsStatement::GetColumnIndex(const char* column_name) {
  try {
    return m_statement.getColumnIndex(column_name);
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

int SmsStatement::GetColumnIndex(const std::string& column_name) {
  try {
    return m_statement.getColumnIndex(column_name.c_str());
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetColumnCount
 * @brief return the number of columns in the result
 * @return - column count
 * @throw db_manager::SmsDatabaseException in case of error
 */
int SmsStatement::GetColumnCount() {
  try {
    return m_statement.getColumnCount();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * GetSQL
 * @brief return the SQL string
 * @return - SQL string
 * @throw db_manager::SmsDatabaseException in case of error
 */
const std::string& SmsStatement::GetSQL() {
  try {
    return m_statement.getQuery();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * HasRow
 * @brief true when a row has been fetched with executeStep()
 * @return - true has row
 *         - false not has row
 * @throw db_manager::SmsDatabaseException in case of error
 */
bool SmsStatement::HasRow() {
  try {
    return m_statement.hasRow();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * IsDone
 * @brief true when a row has been fetched with executeStep()
 * @return - true has row
 *         - false not has row
 * @throw db_manager::SmsDatabaseException in case of error
 */
bool SmsStatement::IsDone() {
  try {
    return m_statement.isDone();
  } catch (SQLite::Exception& ex) {
    throw SmsDatabaseException(ex.what());
  }
}

}  // namespace db_manager
