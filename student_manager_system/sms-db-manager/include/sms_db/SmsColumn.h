/**
 * @file SmsColumn.h
 * @brief sms column header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_SMS_DB_SMSCOLUMN_H_
#define DB_MANAGER_INCLUDE_SMS_DB_SMSCOLUMN_H_

#include "SQLiteCPP/Column.h"


namespace db_manager {

/**
 * @brief column type
 * */
enum SmsColumnType { Integer, Float, Text, Blob, Null };

/**
 * @class SmsColumn
 * @brief goyo column implementation
 */
class SmsColumn {
 public:
  /**
   * @fn
   * SmsColumn
   * @param column SQLite column which converts to SmsColumn
   * @brief constructor
   */
  explicit SmsColumn(SQLite::Column& column);

  /**
   * @fn
   * SmsColumn
   * @brief destructor
   */
  ~SmsColumn();

  /**
   * @fn
   * GetName
   * @brief return a column name
   * @return - column name
   */
  const char* GetName() const noexcept;

  /**
   * @fn
   * GetInt
   * @brief return integer value
   * @return - integer value
   */
  int GetInt() const noexcept;

  /**
   * @fn
   * GetUInt
   * @brief return unsigned integer value
   * @return - unsigned integer value
   */
  unsigned int GetUInt() const noexcept;

  /**
   * @fn
   * GetInt64
   * @brief return 64bits integer value
   * @return - 64bits integer value
   */
  long long GetInt64() const noexcept;

  /**
   * @fn
   * GetDouble
   * @brief return 64bits float value
   * @return - 64bits float value
   */
  double GetDouble() const noexcept;

  /**
   * @fn
   * GetText
   * @brief return text value
   * @return - text value
   */
  const char* GetText(const char* default_value = "") const noexcept;

  /**
   * @fn
   * GetBlob
   * @brief return blob value
   * @return - blob value
   */
  const void* GetBlob() const noexcept;

  /**
   * @fn
   * GetString
   * @brief return blob or text value
   * @return - blob or text value
   */
  std::string GetString() const;

  /**
   * @fn
   * GetType
   * @brief return column type
   * @return - column type
   */
  SmsColumnType GetType() const noexcept;

  /**
   * @fn
   * IsInteger
   * @brief test if the column is a integer type value
   * @return - true column is integer type
   *         - false column is not an integer type
   */
  bool IsInteger() const noexcept;

  /**
   * @fn
   * IsInteger
   * @brief test if the column is a floating point type value
   * @return - true column is floating point type
   *         - false column is not an floating pointer type
   */
  bool IsFloat() const noexcept;

  /**
   * @fn
   * IsText
   * @brief test if the column is a text type value
   * @return - true column is text type
   *         - false column is not an text type
   */
  bool IsText() const noexcept;

  /**
   * @fn
   * IsBlob
   * @brief test if the column is a blob type value
   * @return - true column is blob type
   *         - false column is not an blob type
   */
  bool IsBlob() const noexcept;

  /**
   * @fn
   * IsNull
   * @brief test if the column is a NULL
   * @return - true column is NULL
   *         - false column is not NULL
   */
  bool IsNull() const noexcept;

  /**
   * @fn
   * GetByteLength
   * @brief return the number of bytes used by teh text or blob
   * @return - number of bytes
   */
  int GetByteLength() const noexcept;

 private:
  // instance of SQLite Column
  SQLite::Column m_column;
};

}  // namespace goyo_db_manager

#endif  // DB_MANAGER_INCLUDE_SMS_DB_SMSCOLUMN_H_
