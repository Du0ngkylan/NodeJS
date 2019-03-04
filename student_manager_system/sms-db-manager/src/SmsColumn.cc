/**
 * @file SmsColumn.cc
 * @brief sms column implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/SmsColumn.h"

namespace db_manager {

/**
 * @fn
 * SmsColumn
 * @param column SQLite column which converts to SmsColumn
 * @brief constructor
 */
SmsColumn::SmsColumn(SQLite::Column& column) : m_column(column) {}

/**
 * @fn
 * ~SmsColumn
 * @brief destructor
 */
SmsColumn::~SmsColumn() {}

/**
 * @fn
 * GetName
 * @brief return a column name
 * @return - column name
 */
const char* SmsColumn::GetName() const noexcept { return m_column.getName(); }

/**
 * @fn
 * GetInt
 * @brief return integer value
 * @return - integer value
 */
int SmsColumn::GetInt() const noexcept { return m_column.getInt(); }

/**
 * @fn
 * GetUInt
 * @brief return unsigned integer value
 * @return - unsigned integer value
 */
unsigned int SmsColumn::GetUInt() const noexcept { return m_column.getUInt(); }

/**
 * @fn
 * GetInt64
 * @brief return 64bits integer value
 * @return - 64bits integer value
 */
long long SmsColumn::GetInt64() const noexcept { return m_column.getInt64(); }

/**
 * @fn
 * GetDouble
 * @brief return 64bits float value
 * @return - 64bits float value
 */
double SmsColumn::GetDouble() const noexcept { return m_column.getDouble(); }

/**
 * @fn
 * GetText
 * @brief return text value
 * @return - text value
 */
const char* SmsColumn::GetText(const char* default_value) const noexcept {
  return m_column.getText(default_value);
}

/**
 * @fn
 * GetBlob
 * @brief return blob value
 * @return - blob value
 */
const void* SmsColumn::GetBlob() const noexcept { return m_column.getBlob(); }

/**
 * @fn
 * GetString
 * @brief return blob or text value
 * @return - blob or text value
 */
std::string SmsColumn::GetString() const { return m_column.getString(); }

/**
 * @fn
 * GetType
 * @brief return column type
 * @return - column type
 */
SmsColumnType SmsColumn::GetType() const noexcept {
  return static_cast<SmsColumnType>(m_column.getType());
}

/**
 * @fn
 * IsInteger
 * @brief test if the column is a integer type value
 * @return - true column is integer type
 *         - false column is not an integer type
 */
bool SmsColumn::IsInteger() const noexcept { return m_column.isInteger(); }

/**
 * @fn
 * IsInteger
 * @brief test if the column is a floating point type value
 * @return - true column is floating point type
 *         - false column is not an floating pointer type
 */
bool SmsColumn::IsFloat() const noexcept { return m_column.isFloat(); }

/**
 * @fn
 * IsText
 * @brief test if the column is a text type value
 * @return - true column is text type
 *         - false column is not an text type
 */
bool SmsColumn::IsText() const noexcept { return m_column.isText(); }

/**
 * @fn
 * IsBlob
 * @brief test if the column is a blob type value
 * @return - true column is blob type
 *         - false column is not an blob type
 */
bool SmsColumn::IsBlob() const noexcept { return m_column.isBlob(); }

/**
 * @fn
 * IsNull
 * @brief test if the column is a NULL
 * @return - true column is NULL
 *         - false column is not NULL
 */
bool SmsColumn::IsNull() const noexcept { return m_column.isNull(); }

/**
 * @fn
 * GetByteLength
 * @brief return the number of bytes used by teh text or blob
 * @return - number of bytes
 */
int SmsColumn::GetByteLength() const noexcept { return m_column.getBytes(); }

}  // namespace db_manager
