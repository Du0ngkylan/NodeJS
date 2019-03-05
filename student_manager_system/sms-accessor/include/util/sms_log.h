/**
 * @file goyo_log.h
 * @brief log utility header
 * @author yonaha
 * @date 2018/02/19
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_UTIL_GOYO_LOG_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_UTIL_GOYO_LOG_H_

#include <string>

namespace goyo_bookrack_accessor {


#define GoyoTraceLog(m)   GoyoLogUtil::WriteTraceLog(m, _T(__FILE__),__LINE__)
#define GoyoDebugLog(m)   GoyoLogUtil::WriteDebugLog(m, _T(__FILE__),__LINE__)
#define GoyoInfoLog(m)    GoyoLogUtil::WriteInfoLog(m, _T(__FILE__),__LINE__)
#define GoyoWarningLog(m) GoyoLogUtil::WriteWarningLog(m, _T(__FILE__),__LINE__)
#define GoyoErrorLog(m)   GoyoLogUtil::WriteErrorLog(m, _T(__FILE__),__LINE__)
#define GoyoFatalLog(m)   GoyoLogUtil::WriteFatalLog(m, _T(__FILE__),__LINE__)

/**
 * @class GoyoLogUtil
 * @brief log utility
 */
class GoyoLogUtil {
 public:

  /**
  * @fn
  * ~GoyoLogUtil
  * @brief destructor
  */
  ~GoyoLogUtil();

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
  * GoyoLogUtil
  * @brief constructor
  */
  GoyoLogUtil();

};

}

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_UTIL_GOYO_LOG_H_
