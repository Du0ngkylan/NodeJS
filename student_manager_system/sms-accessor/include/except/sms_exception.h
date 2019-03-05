/**
 * @file sms_exception.h
 * @brief sms exception header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_EXCEPT_Sms_EXCEPTION_H_
#define SMS_ACCESSOR_INCLUDE_EXCEPT_Sms_EXCEPTION_H_

#include <exception>
#include <string>

#define THROW_EXCEPTION(EXCEPTION_TYPE, message) \
  throw EXCEPTION_TYPE(message, __FILE__, __func__, __LINE__)

namespace sms_accessor {

/**
 * @class SmsException
 * @brief  Sms exception
 */
class SmsException : public std::exception {
 public:
  /**
   * @fn
   * SmsException
   * @brief constructor
   * @param (message) message that throws
   */
  explicit SmsException(const std::string& message);

  /**
   * @fn
   * SmsException
   * @brief constructor
   * @param (message) message that throws
   */
  explicit SmsException(const std::wstring& message);

  /**
   * @fn
   * SmsException
   * @brief constructor
   * @param (message) message that throws
   * @param (file) file that throws
   * @param (function) function that throws
   * @param (line) line number that throws
   */
  SmsException(const std::string& message, const char* file,
                const char* funcion, const int line);

  /**
   * @fn
   * SmsException
   * @brief constructor
   * @param (message) message that throws
   * @param (file) file that throws
   * @param (function) function that throws
   * @param (line) line number that throws
   */
  SmsException(const std::wstring& message, const char* file,
                const char* funcion, const int line);

  /**
   * @fn
   * ~SmsException
   * @brief destructor
   */
  virtual ~SmsException() throw();

  /**
   * @fn
   * GetFileName
   * @brief Get file name that throws exception
   * @return file name
   */
  const char* GetFileName() const;

  /**
   * @fn
   * GetFunctionName
   * @brief Get function name that throws exception
   * @return function name
   */
  const char* GetFunctionName() const;

  /**
   * @fn
   * GetLineNumber
   * @brief Get line number that throws exception
   * @return line number
   */
  const int GetLineNumber() const;

  /**
   * @fn
   * What
   * @brief Get message that throws
   * @return message
   */
  virtual const char* What() const throw();
  virtual const char* what() const throw();

 private:
  // message that throws
  std::string m_message;

  // file name that thows
  const char* m_file_name;

  // function name that thows
  const char* m_function_name;

  // line number that throws
  int m_line;
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_EXCEPT_Sms_EXCEPTION_H_
