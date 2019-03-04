/**
 * @file SmsDatabaseException.cc
 * @brief goyo database exception implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/SmsDatabaseException.h"
#include <iostream>

namespace db_manager {

/**
 * @fn
 * SmsDatabaseException
 * @brief constructor
 * @param message message that throws
 */
SmsDatabaseException::SmsDatabaseException(const std::string& message) : m_message(message) {}

/**
 * @fn
 * SmsDatabaseException
 * @brief constructor
 * @param message message that throws
 * @param file file that throws
 * @param function function that throws
 * @param line line number that throws
 */
SmsDatabaseException::SmsDatabaseException(const std::string& message, const char* file,
                             const char* function, const int line)
    : m_message(message),
      m_file_name(file),
      m_function_name(function),
      m_line(line) {}

/**
 * @fn
 * ~SmsDatabaseException
 * @brief destructor
 */
SmsDatabaseException::~SmsDatabaseException() throw() {}

/**
 * @fn
 * What
 * @brief Get message that throws
 * @return message
 */
const char* SmsDatabaseException::What() const throw() { return m_message.c_str(); }

/**
 * @fn
 * GetFileName
 * @brief Get file name that throws exception
 * @return file name
 */
const char* SmsDatabaseException::GetFileName() const { return m_file_name; }

/**
 * @fn
 * GetFunctionName
 * @brief Get function name that throws exception
 * @return function name
 */
const char* SmsDatabaseException::GetFunctionName() const { return m_function_name; }

/**
 * @fn
 * GetLineNumber
 * @brief Get line number that throws exception
 * @return line number
 */
const int SmsDatabaseException::GetLineNumber() const { return m_line; }

}  // namespace db_manager
