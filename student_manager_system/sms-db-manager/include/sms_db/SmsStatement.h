/**
 * @file SmsStatement.h
 * @brief sms statement header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_SMSSTATEMENT_H_
#define DB_MANAGER_INCLUDE_DB_SMSSTATEMENT_H_

#include "SQLiteCpp/Statement.h"
#include "sms_db/SmsDatabase.h"


namespace db_manager {

// get shared m_db to SmsDatabase
class SmsDatabase;

/**
 * @class SmsStatement
 * @brief goyo statement implementation
 */
class SmsStatement {
 public:
  /**
   * @fn
   * SmsStatement
   * @brief constructor
   * @param database SmsDatabase
   * @param query SQL query string
   */
  SmsStatement(SmsDatabase& database, const char* query);
  SmsStatement(SmsDatabase& database, const std::string& query);

  /**
   * @fn
   * ~SmsStatement
   * @brief destructor
   */
  ~SmsStatement();

  /**
   * @fn
   * Reset
   * @brief reset the statement to make it ready for a new execution.
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void Reset();

  /**
   * @fn
   * ClearBindings
   * @brief clears away all the bindings of a prepared statement.
   *  Contrary to the intuition of many, reset() does not reset the bindings on
   * a prepared statement. Use this routine to reset all parameters to NULL.
   */
  void ClearBindings();

  /**
   * @fn
   * Bind
   * @brief bind a value to a parameter of the SQL statement.
   * @param column_index column index
   * @param value       value
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void Bind(const int column_index, const int value);
  void Bind(const int column_index, const std::string& value);
  void Bind(const int column_index, const char* value);
  void Bind(const int column_index, const long long value);
  void Bind(const int column_index, const double value);

  /**
   * @fn
   * Bind
   * @brief bind a value to a parameter of the SQL statement.
   * @param column_index column index
   * @param value       value
   * @param value_size   value size
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void Bind(const int column_index, const void* value, const int value_size);

  /**
   * @fn
   * BindNull
   * @brief bind a null to a parameter of the SQL statement.
   * @param column_index column index
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void BindNull(const int column_index);

  /**
   * @fn
   * Bind
   * @brief bind a value to a parameter of the SQL statement.
   * @param column_name column name
   * @param value       value
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void Bind(const char* column_name, const int value);
  void Bind(const char* column_name, const std::string& value);
  void Bind(const char* column_name, const char* value);
  void Bind(const char* column_name, const long long value);
  void Bind(const char* column_name, const double value);
  void Bind(const std::string& column_name, const int value);
  void Bind(const std::string& column_name, const std::string& value);
  void Bind(const std::string& column_name, const char* value);
  void Bind(const std::string& column_name, const long long value);
  void Bind(const std::string& column_name, const double value);

  /**
   * @fn
   * Bind
   * @brief bind a value to a parameter of the SQL statement.
   * @param column_name column name
   * @param value       value
   * @param value_size   value size
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void Bind(const char* column_name, const void* value, const int value_size);
  void Bind(const std::string& column_name, const void* value,
            const int value_size);

  /**
   * @fn
   * BindNull
   * @brief bind a null to a parameter of the SQL statement.
   * @param column_name column name
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  void BindNull(const char* column_name);
  void BindNull(const std::string& column_name);

  /**
   * @fn
   * ExecuteStep
   * @brief execute a step of the prepared query to fetch one row of results.
   * @return - true if there is another row ready
   *         - false if the query has finished executing
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  bool ExecuteStep();

  /**
   * @fn
   * Execute
   * @brief execute a one-step query with no expected result.
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  int Execute();

  /**
   * @fn
   * GetColumn
   * @brief return a copy of the column data specified by its index
   * @param column_index column index
   * @return - column
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  SmsColumn GetColumn(const int column_index);

  /**
   * @fn
   * GetColumn
   * @brief return a copy of the column data specified by its name
   * @param column_name column name
   * @return - column
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  SmsColumn GetColumn(const char* column_name);
  SmsColumn GetColumn(const std::string& column_name);

  /**
   * @fn
   * IsColumnNull
   * @brief test if the column value is NULL
   * @param column_index column index
   * @return - true NULL
   *         - false not NULL
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  bool IsColumnNull(const int column_index);

  /**
   * @fn
   * IsColumnNull
   * @brief test if the column value is NULL
   * @param column_name column name
   * @return - true NULL
   *         - false not NULL
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  bool IsColumnNull(const char* column_name);
  bool IsColumnNull(const std::string& column_name);

  /**
   * @fn
   * GetColumnName
   * @brief return the column name
   * @param column_index column index
   * @return - column name
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  const char* GetColumnName(const int column_index);

  /**
   * @fn
   * GetColumnIndex
   * @brief return the column index
   * @param column_name column name
   * @return - column index
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  int GetColumnIndex(const char* column_name);
  int GetColumnIndex(const std::string& column_name);

  /**
   * @fn
   * GetColumnCount
   * @brief return the number of columns in the result
   * @return - column count
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  int GetColumnCount();

  /**
   * @fn
   * GetSQL
   * @brief return the SQL string
   * @return - SQL string
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  const std::string& GetSQL();

  /**
   * @fn
   * HasRow
   * @brief true when a row has been fetched with executeStep()
   * @return - true has row
   *         - false not has row
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  bool HasRow();

  /**
   * @fn
   * IsDone
   * @brief true when all rows has been fetched with executeStep()
   * @return - true has row
   *         - false not has row
   * @throw sms_db_manager::SmsDatabaseException in case of error
   */
  bool IsDone();

 private:
  // instance of SQLite Statement
  SQLite::Statement m_statement;
};

}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_SMSSTATEMENT_H_
