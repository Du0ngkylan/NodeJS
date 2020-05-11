/**
 * @file sms_log.cc
 * @brief log utility implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "util/sms_log.h"
#include "util/sms_app_util.h"
#include <Windows.h>

using namespace std;

namespace accessor {

  enum SmsLogLevel {
    SMS_TRACE = 5, 
    SMS_DEBUG = 4, 
    SMS_INFO = 3, 
    SMS_WARN = 2,
    SMS_ERROR = 1,
    SMS_FATAL = 0,
  };

  static SmsLogLevel log_level_ = SmsLogLevel::SMS_INFO;

  /**
   * @fn
   * PathToFileName
   * @brief path to file name
   * @return file name
   */
  static std::string PathToFileName(std::wstring path) {
    return SmsAppUtil::Utf16ToUtf8(path.substr(path.find_last_of(L"/\\")+1));
  }

  /**
   * @fn
   * SmsLogUtil
   * @brief constructor
   */
  SmsLogUtil::SmsLogUtil() {}

  /**
   * @fn
   * ~SmsLogUtil
   * @brief destructor
   */
  SmsLogUtil::~SmsLogUtil() {}

  const ULONGLONG MAX_FREE_SIZE_MB = 10ULL;
  const std::wstring DEF_LOG = L"logs/%Y%m%d_%5N.Sms_log";
  std::wstring log_root_f;

  /**
  * @fn
  * SetLogLevel
  * @param(level) log_level
  * @brief set log level
  */
  void SmsLogUtil::SetLogLevel(wchar_t* level) {
    if (level != nullptr) {
      auto l = std::wstring(level);

      if (l == L"5") {
        log_level_ = SmsLogLevel::SMS_TRACE;
      } else if (l == L"4") {
        log_level_ = SmsLogLevel::SMS_DEBUG;
      } else if (l == L"2") {
        log_level_  = SmsLogLevel::SMS_WARN;
      } else if (l == L"1") {
        log_level_  = SmsLogLevel::SMS_ERROR;
      } else if (l == L"0") {
        log_level_  = SmsLogLevel::SMS_FATAL;
      } else {
        log_level_ = SmsLogLevel::SMS_INFO;
      }
    } else {
      log_level_ = SMS_INFO;
    }
  }

  /**
  * @fn
  * GetLogLevel
  * @brief get log level
  */
  int SmsLogUtil::GetLogLevel() {
    return static_cast<int>(log_level_);
  }

}
