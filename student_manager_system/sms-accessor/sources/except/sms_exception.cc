/**
 * @file sms_exception.cc
 * @brief sms exception implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <codecvt>
#include <iostream>
#include "except/sms_exception.h"
#include "util/sms_app_util.h"


namespace sms_accessor {

/**
 * @fn
 * SmsException
 * @brief constructor
 * @param (message) message that throws
 */
SmsException::SmsException(const std::string& message) : m_message(message) {}

/**
 * @fn
 * SmsException
 * @brief constructor
 * @param (message) message that throws
 */
SmsException::SmsException(const std::wstring& message) {
  m_message = SmsAppUtil::Utf16ToUtf8(message);
}

/**
 * @fn
 * SmsException
 * @brief constructor
 * @param (message) message that throws
 * @param (file) file that throws
 * @param (function) function that throws
 * @param (line) line number that throws
 */
SmsException::SmsException(const std::string& message, const char* file,
                             const char* function, const int line)
    : m_message(message),
      m_file_name(file),
      m_function_name(function),
      m_line(line) {}

/**
 * @fn
 * SmsException
 * @brief constructor
 * @param (message) message that throws
 * @param (file) file that throws
 * @param (function) function that throws
 * @param (line) line number that throws
 */
SmsException::SmsException(const std::wstring& message, const char* file,
    const char* function, const int line)
    : m_file_name(file), m_function_name(function), m_line(line) {
  m_message = SmsAppUtil::Utf16ToUtf8(message);
}

/**
 * @fn
 * ~SmsException
 * @brief destructor
 */
SmsException::~SmsException() throw() {}

/**
 * @fn
 * What
 * @brief Get message that throws
 * @return message
 */
const char* SmsException::What() const throw() { return m_message.c_str(); }

/**
 * @fn
 * what
 * @brief Get message that throws
 * @return message
 */
const char* SmsException::what() const throw() { return m_message.c_str(); }

/**
 * @fn
 * GetFileName
 * @brief Get file name that throws exception
 * @return file name
 */
const char* SmsException::GetFileName() const { return m_file_name; }

/**
 * @fn
 * GetFunctionName
 * @brief Get function name that throws exception
 * @return function name
 */
const char* SmsException::GetFunctionName() const { return m_function_name; }

/**
 * @fn
 * GetLineNumber
 * @brief Get line number that throws exception
 * @return line number
 */
const int SmsException::GetLineNumber() const { return m_line; }

}  // namespace sms_accessor
