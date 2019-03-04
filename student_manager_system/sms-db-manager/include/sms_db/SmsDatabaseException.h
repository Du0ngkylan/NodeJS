/**
 * @file SmsDatabaseException.h
 * @brief sms database exception header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_SMSDATABASEEXCEPTION_H_
#define DB_MANAGER_INCLUDE_DB_SMSDATABASEEXCEPTION_H_

#include <exception>
#include <string>

#define THROW_EXCEPTION(EXCEPTION_TYPE, message) \
  throw EXCEPTION_TYPE(message, __FILE__, __func__, __LINE__)

namespace db_manager {

/**
 * @class SmsDatabaseException
 * @brief  sms database exception
 */
class SmsDatabaseException : public std::exception {
 public:
  /**
   * @fn
   * SmsDatabaseException
   * @brief constructor
   * @param message message that throws
   */
  explicit SmsDatabaseException(const std::string& message);

  /**
   * @fn
   * SmsDatabaseException
   * @brief constructor
   * @param message message that throws
   * @param file file that throws
   * @param function function that throws
   * @param line line number that throws
   */
  SmsDatabaseException(const std::string& message,
                       const char* file,
                       const char* funcion, const int line);

  /**
   * @fn
   * ~SmsDatabaseException
   * @brief destructor
   */
  virtual ~SmsDatabaseException() throw();

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

}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_SMSDATABASEEXCEPTION_H_
