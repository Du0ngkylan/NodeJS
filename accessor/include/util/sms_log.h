/**
 * @file sms_log.h
 * @brief log utility header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_UTIL_SMS_LOG_H_
#define ACCESSOR_INCLUDE_UTIL_SMS_LOG_H_

#include <string>

namespace accessor {


#define SmsTraceLog(m)   SmsLogUtil::WriteTraceLog(m, _T(__FILE__),__LINE__)
#define SmsDebugLog(m)   SmsLogUtil::WriteDebugLog(m, _T(__FILE__),__LINE__)
#define SmsInfoLog(m)    SmsLogUtil::WriteInfoLog(m, _T(__FILE__),__LINE__)
#define SmsWarningLog(m) SmsLogUtil::WriteWarningLog(m, _T(__FILE__),__LINE__)
#define SmsErrorLog(m)   SmsLogUtil::WriteErrorLog(m, _T(__FILE__),__LINE__)
#define SmsFatalLog(m)   SmsLogUtil::WriteFatalLog(m, _T(__FILE__),__LINE__)

/**
 * @class SmsLogUtil
 * @brief log utility
 */
class SmsLogUtil {
 public:
  /**
  * @fn
  * ~SmsLogUtil
  * @brief destructor
  */
  ~SmsLogUtil();

  /**
  * @fn
  * InitializeLogSystem
  * @brief initialize log system
  * @param folder 
  */
  static void InitializeLogSystem(const wchar_t* folder);

  /**
  * @fn
  * WriteTraceLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write trce log
  */
  static void WriteTraceLog(const std::string &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteTraceLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write trce log
  */
  static void WriteTraceLog(const std::wstring &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteDebugLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write debug log
  */
  static void WriteDebugLog(const std::string &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteDebugLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write debug log
  */
  static void WriteDebugLog(const std::wstring &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteInfoLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write info log
  */
  static void WriteInfoLog(const std::string &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteInfoLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write info log
  */
  static void WriteInfoLog(const std::wstring &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteWarningLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write warning log
  */
  static void WriteWarningLog(const std::string &message,
                              const wchar_t* file, const int line);

  /**
  * @fn
  * WriteWarningLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write warning log
  */
  static void WriteWarningLog(const std::wstring &message,
                              const wchar_t* file, const int line);

  /**
  * @fn
  * WriteErrorLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write error log
  */
  static void WriteErrorLog(const std::string &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteErrorLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write error log
  */
  static void WriteErrorLog(const std::wstring &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteFatalLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write fatal log
  */
  static void WriteFatalLog(const std::string &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * WriteFatalLog
  * @param(message) message
  * @param(file) file
  * @param(line) line number
  * @brief write fatal log
  */
  static void WriteFatalLog(const std::wstring &message,
                            const wchar_t* file, const int line);

  /**
  * @fn
  * SetLogLevel
  * @param(level) log_level
  * @brief set log level
  */
  static void SetLogLevel(wchar_t* level);

  /**
  * @fn
  * GetLogLevel
  * @brief get log level
  */
  static int GetLogLevel();

 private:
  /**
  * @fn
  * SmsLogUtil
  * @brief constructor
  */
  SmsLogUtil();
};

}

#endif  // ACCESSOR_INCLUDE_UTIL_SMS_LOG_H_
