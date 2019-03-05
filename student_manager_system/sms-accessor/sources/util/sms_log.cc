/**
 * @file goyo_log.cc
 * @brief log utility implementation
 * @author yonaha
 * @date 2018/02/19
 */

#include <boost/log/trivial.hpp>
#include <boost/log/sources/severity_logger.hpp>
#include <boost/log/utility/setup/file.hpp>
#include <boost/log/utility/setup/console.hpp>
#include <boost/log/expressions.hpp>
#include <boost/log/utility/setup/common_attributes.hpp>
#include <boost/log/attributes/mutable_constant.hpp>
#include <boost/date_time/posix_time/posix_time_types.hpp>
#include <boost/log/support/date_time.hpp>
#include <boost/log/attributes/mutable_constant.hpp>
#include "util/goyo_log.h"
#include "util/goyo_app_util.h"
#include <Windows.h>

namespace logging = boost::log;
namespace attrs = boost::log::attributes;
namespace keywords = boost::log::keywords;
namespace src = boost::log::sources;
namespace expr = boost::log::expressions;
namespace fs = boost::filesystem;
using namespace std;

namespace goyo_bookrack_accessor {

  enum GoyoLogLevel {
    GOYO_TRACE = 5, 
    GOYO_DEBUG = 4, 
    GOYO_INFO = 3, 
    GOYO_WARN = 2,
    GOYO_ERROR = 1,
    GOYO_FATAL = 0,
  };

  static GoyoLogLevel log_level_ = GoyoLogLevel::GOYO_INFO;

// macro that includes severity, filename and line number
#define CUSTOM_LOG(logger, sev, file, line) \
   BOOST_LOG_STREAM_WITH_PARAMS( \
      (logger), \
         (SetToGetAttribute("File", PathToFileName(file))) \
         (SetToGetAttribute("Line", line)) \
         (::boost::log::keywords::severity = (boost::log::trivial::sev)) \
   )
  
  /**
   * @fn
   * SetToGetAttribute
   * @brief set the get attribute
   * @return value type
   */
  template<typename ValueType>
  static ValueType SetToGetAttribute(const char* name, ValueType value) {
    auto attr = logging::attribute_cast<attrs::mutable_constant<ValueType>>
                        (logging::core::get()->get_global_attributes()[name]);
    attr.set(value);
    return attr.get();
  }

  /**
   * @fn
   * PathToFileName
   * @brief path to file name
   * @return file name
   */
  static std::string PathToFileName(std::wstring path) {
    return GoyoAppUtil::Utf16ToUtf8(path.substr(path.find_last_of(L"/\\")+1));
  }

  /**
   * @fn
   * GoyoLogUtil
   * @brief constructor
   */
  GoyoLogUtil::GoyoLogUtil() {}

  /**
   * @fn
   * ~GoyoLogUtil
   * @brief destructor
   */
  GoyoLogUtil::~GoyoLogUtil() {}

  const ULONGLONG MAX_FREE_SIZE_MB = 10ULL;
  const std::wstring DEF_LOG = L"logs/%Y%m%d_%5N.goyo_log";
  std::wstring log_root_f;

  /**
   * @fn
   * InitializeLogSystem
   * @brief initialize log system
   */
  void GoyoLogUtil::InitializeLogSystem(const wchar_t* folder) {
    logging::core::get()->add_global_attribute("File",
                                  attrs::mutable_constant<std::string>(""));
    logging::core::get()->add_global_attribute("Line",
                                  attrs::mutable_constant<int>(0));

    fs::wpath f;
    boost::system::error_code error;
    if (folder == NULL
      || !GoyoAppUtil::ExistsFile(wstring(folder))) {
      log_root_f = DEF_LOG;
      f = fs::wpath(DEF_LOG);
    } else {
      log_root_f = wstring(folder);
      f = fs::wpath(log_root_f + L"\\" + DEF_LOG);
    }

    if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB) {
      logging::add_common_attributes();
      logging::add_file_log(
        keywords::file_name = f,
        keywords::open_mode = std::ios_base::app,
        keywords::rotation_size = 5 * 1024 * 1024,
        keywords::auto_flush = true,
        // keywords::format = "[%TimeStamp%][%Severity%][%LineID%]: %Message%"
        keywords::format = (
          expr::stream
          << expr::format_date_time<boost::posix_time::ptime>("TimeStamp",
            "[%Y-%m-%d_%H:%M:%S.%f]")
          << ": [" << boost::log::trivial::severity << "] "
          << '[' << expr::attr<std::string>("File")
          << ':' << expr::attr<int>("Line") << "] "
          << expr::smessage
          )
      );
    }

  }

  /**
   * @fn
   * WriteTraceLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write trce log
   */
  void GoyoLogUtil::WriteTraceLog(const std::string &message,
                                  const wchar_t* file, const int line) {
    src::severity_logger<logging::trivial::severity_level> lg;
    
    if (log_level_ != GoyoLogLevel::GOYO_TRACE) return;

	  try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
	      CUSTOM_LOG(lg, trace, file, line) << message;
	  } catch (...) {
    }
  }

  /**
   * @fn
   * WriteTraceLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write trace log
   */
  void GoyoLogUtil::WriteTraceLog(const std::wstring& message,
                                  const wchar_t* file, const int line) {
      
      if (log_level_ != GoyoLogLevel::GOYO_TRACE) return;

      auto str = GoyoAppUtil::Utf16ToUtf8(message);
      src::severity_logger<logging::trivial::severity_level> lg;
      try {
        if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
          CUSTOM_LOG(lg, trace, file, line) << str;
	    } catch (...) {
      }
  }

  /**
   * @fn
   * WriteDebugLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write debug log
   */
  void GoyoLogUtil::WriteDebugLog(const std::string &message,
                                  const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_DEBUG) return;

    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, debug, file, line) << message;
	  } catch (...) {
    }
  }

  /**
   * @fn
   * WriteDebugLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write debug log
   */
  void GoyoLogUtil::WriteDebugLog(const std::wstring& message,
                                  const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_DEBUG) return;

    auto str = GoyoAppUtil::Utf16ToUtf8(message);
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, debug, file, line) << str;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteInfoLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write info log
   */
  void GoyoLogUtil::WriteInfoLog(const std::string &message,
                                 const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_INFO) return;

    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, info, file, line) << message;
	  } catch (...) {
    }
  }

  /**
   * @fn
   * WriteInfoLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write info log
   */
  void GoyoLogUtil::WriteInfoLog(const std::wstring& message,
                                 const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_INFO) return;

    auto str = GoyoAppUtil::Utf16ToUtf8(message);
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, info, file, line) << str;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteWarningLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write warning log
   */
  void GoyoLogUtil::WriteWarningLog(const std::string &message,
                                    const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_WARN) return;

    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, warning, file, line) << message;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteWarningLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write warning log
   */
  void GoyoLogUtil::WriteWarningLog(const std::wstring& message,
                                    const wchar_t* file,const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_WARN) return;

    auto str = GoyoAppUtil::Utf16ToUtf8(message);
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, warning, file, line) << str;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteErrorLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write error log
   */
  void GoyoLogUtil::WriteErrorLog(const std::string &message,
                                  const wchar_t* file, const int line) {

    if (log_level_ < GoyoLogLevel::GOYO_ERROR) return;

    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, error, file, line) << message;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteErrorLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write error log
   */
  void GoyoLogUtil::WriteErrorLog(const std::wstring& message,
                                  const wchar_t* file, const int line) {
    if (log_level_ < GoyoLogLevel::GOYO_ERROR) return;

    auto str = GoyoAppUtil::Utf16ToUtf8(message);
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, error, file, line) << str;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteFatalLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write fatal log
   */
  void GoyoLogUtil::WriteFatalLog(const std::string &message,
                                  const wchar_t* file, const int line) {
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, fatal, file, line) << message;
    } catch (...) {
    }
  }

  /**
   * @fn
   * WriteFatalLog
   * @param(message) message
   * @param(file) file
   * @param(line) line number
   * @brief write fatal log
   */
  void GoyoLogUtil::WriteFatalLog(const std::wstring& message,
                                  const wchar_t* file, const int line) {
    auto str = GoyoAppUtil::Utf16ToUtf8(message);
    src::severity_logger<logging::trivial::severity_level> lg;
    try {
      if (GoyoAppUtil::GetDiskFreeSpaceSize(log_root_f) > MAX_FREE_SIZE_MB)
        CUSTOM_LOG(lg, fatal, file, line) << str;
    } catch (...) {
    }
  }

  /**
  * @fn
  * SetLogLevel
  * @param(level) log_level
  * @brief set log level
  */
  void GoyoLogUtil::SetLogLevel(wchar_t* level) {
    if (level != nullptr) {
      auto l = std::wstring(level);

      if (l == L"5") {
        log_level_ = GoyoLogLevel::GOYO_TRACE;
      } else if (l == L"4") {
        log_level_ = GoyoLogLevel::GOYO_DEBUG;
      } else if (l == L"2") {
        log_level_  = GoyoLogLevel::GOYO_WARN;
      } else if (l == L"1") {
        log_level_  = GoyoLogLevel::GOYO_ERROR;
      } else if (l == L"0") {
        log_level_  = GoyoLogLevel::GOYO_FATAL;
      } else {
        log_level_ = GoyoLogLevel::GOYO_INFO;
      }
    } else {
      log_level_ = GOYO_INFO;
    }
  }

  /**
  * @fn
  * GetLogLevel
  * @brief get log level
  */
  int GoyoLogUtil::GetLogLevel() {
    return static_cast<int>(log_level_);
  }

}
