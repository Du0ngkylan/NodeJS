/**
 * @file goyo_exception.h
 * @brief goyo exception header
 * @author yonaha
 * @date 2018/02/20
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_EXCEPT_GOYO_EXCEPTION_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_EXCEPT_GOYO_EXCEPTION_H_

#include <exception>
#include <string>

#define THROW_EXCEPTION(EXCEPTION_TYPE, message) \
  throw EXCEPTION_TYPE(message, __FILE__, __func__, __LINE__)

namespace goyo_bookrack_accessor {

/**
 * @class GoyoException
 * @brief  goyo exception
 */
class GoyoException : public std::exception {
 public:
  /**
   * @fn
   * GoyoException
   * @brief constructor
   * @param (message) message that throws
   */
  explicit GoyoException(const std::string& message);

  /**
   * @fn
   * GoyoException
   * @brief constructor
   * @param (message) message that throws
   */
  explicit GoyoException(const std::wstring& message);

  /**
   * @fn
   * GoyoException
   * @brief constructor
   * @param (message) message that throws
   * @param (file) file that throws
   * @param (function) function that throws
   * @param (line) line number that throws
   */
  GoyoException(const std::string& message, const char* file,
                const char* funcion, const int line);

  /**
   * @fn
   * GoyoException
   * @brief constructor
   * @param (message) message that throws
   * @param (file) file that throws
   * @param (function) function that throws
   * @param (line) line number that throws
   */
  GoyoException(const std::wstring& message, const char* file,
                const char* funcion, const int line);

  /**
   * @fn
   * ~GoyoException
   * @brief destructor
   */
  virtual ~GoyoException() throw();

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

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_EXCEPT_GOYO_EXCEPTION_H_
