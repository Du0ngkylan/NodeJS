/**
 * @file goyo_exception.cc
 * @brief goyo exception implementation
 * @author yonaha
 * @date 2018/02/20
 */

#include <codecvt>
#include <iostream>
#include "except/goyo_exception.h"
#include "util/goyo_app_util.h"


namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoException
 * @brief constructor
 * @param (message) message that throws
 */
GoyoException::GoyoException(const std::string& message) : m_message(message) {}

/**
 * @fn
 * GoyoException
 * @brief constructor
 * @param (message) message that throws
 */
GoyoException::GoyoException(const std::wstring& message) {
  m_message = GoyoAppUtil::Utf16ToUtf8(message);
}

/**
 * @fn
 * GoyoException
 * @brief constructor
 * @param (message) message that throws
 * @param (file) file that throws
 * @param (function) function that throws
 * @param (line) line number that throws
 */
GoyoException::GoyoException(const std::string& message, const char* file,
                             const char* function, const int line)
    : m_message(message),
      m_file_name(file),
      m_function_name(function),
      m_line(line) {}

/**
 * @fn
 * GoyoException
 * @brief constructor
 * @param (message) message that throws
 * @param (file) file that throws
 * @param (function) function that throws
 * @param (line) line number that throws
 */
GoyoException::GoyoException(const std::wstring& message, const char* file,
    const char* function, const int line)
    : m_file_name(file), m_function_name(function), m_line(line) {
  m_message = GoyoAppUtil::Utf16ToUtf8(message);
}

/**
 * @fn
 * ~GoyoException
 * @brief destructor
 */
GoyoException::~GoyoException() throw() {}

/**
 * @fn
 * What
 * @brief Get message that throws
 * @return message
 */
const char* GoyoException::What() const throw() { return m_message.c_str(); }

/**
 * @fn
 * what
 * @brief Get message that throws
 * @return message
 */
const char* GoyoException::what() const throw() { return m_message.c_str(); }

/**
 * @fn
 * GetFileName
 * @brief Get file name that throws exception
 * @return file name
 */
const char* GoyoException::GetFileName() const { return m_file_name; }

/**
 * @fn
 * GetFunctionName
 * @brief Get function name that throws exception
 * @return function name
 */
const char* GoyoException::GetFunctionName() const { return m_function_name; }

/**
 * @fn
 * GetLineNumber
 * @brief Get line number that throws exception
 * @return line number
 */
const int GoyoException::GetLineNumber() const { return m_line; }

}  // namespace goyo_bookrack_accessor
