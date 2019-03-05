/**
 * @file convert_jpg.cc
 * @brief convert to jpg command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "image/convert_jpg.h"
#include "image/sms_image.h"
#include <boost/algorithm/string.hpp>
#include <boost/filesystem.hpp>
#include <boost/filesystem/operations.hpp>
#include <boost/filesystem/path.hpp>
#include <boost/foreach.hpp>
#include <boost/optional.hpp>
#include "util/sms_app_util.h"

#define CHECK_OPTIONAL(_x, _msg) \
  if (!_x) {                     \
    throw SmsException(_msg);   \
  }
using namespace std;
using namespace json11;

namespace fs = boost::filesystem;

namespace sms_accessor {

  /**
   * @fn
   * SmsConvertJpg
   * @brief constructor
   */
  SmsConvertJpg::SmsConvertJpg() : m_error_type("") {
  }

  /**
   * @fn
   * ~SmsConvertJpg
   * @brief destructor
   */
  SmsConvertJpg::~SmsConvertJpg() {
  }

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json SmsConvertJpg::ExecuteCommand(json11::Json& request, string& raw) {
    bool validatedResult = this->validateRequestParam(request);
    // include validate error, return error response
    if(!validatedResult) {
      return this->CreateErrorResponse(request, kErrorInvalidCommandStr, errorMessage);
    }

    // set parameter
    auto imagePath = SmsAppUtil::Utf8ToUtf16(request["args"]["sourceFile"].string_value());
    auto destFile = SmsAppUtil::Utf8ToUtf16(request["args"]["destFile"].string_value());

    Json response;
    try {
      // constructor
      sms_accessor::SmsImage SmsImage(imagePath);

      // do convert
      bool result = SmsImage.ConvertJpg(destFile);

      if (result != true) {
        return this->CreateErrorResponse(
          request, kErrorInvalidCommandStr, "Failed to convert.");
      }

      // create response
      response = json11::Json::object{
        {"updateCount", 1}
      };
    } catch (SmsException& ex) {
      SmsErrorLog(ex.what());
      return this->CreateErrorResponse(request, kErrorIOStr, ex.what());
    }

    return Json::object{{"request", request}, {"response", response}};
  }

  /**
   * @fn
   * Validator
   * @param (request) request json
   * @return bool result
   */
  bool SmsConvertJpg::validateRequestParam(json11::Json& request) {
    std::string message = "";
    if (!request["args"]["sourceFile"].is_string()) {
      message = "'args.sourceFile' is not specified";
      SmsErrorLog(message);
      errorMessage = message;
      return false;
    }

    if (!request["args"]["destFile"].is_string()) {
      string message = "'args.destFile' is not specified";
      SmsErrorLog(message);
      errorMessage = message;
      return false;
    }

    return true;
  }
  
  /**
   * @fn
   * UTF-8 to Shift-jis converter. 
   * @param (string) UTF-8 string
   * @return std::string shift-jis string
   */
  std::string SmsConvertJpg::UTF8toSjis(std::string srcUTF8){
    int lengthUnicode = MultiByteToWideChar(CP_UTF8, 0, srcUTF8.c_str(),srcUTF8.size() + 1, NULL, 0);
    wchar_t* bufUnicode = new wchar_t[lengthUnicode];
    MultiByteToWideChar(CP_UTF8, 0, srcUTF8.c_str(), srcUTF8.size() + 1,bufUnicode, lengthUnicode);
    int lengthSJis = WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, -1, NULL, 0, NULL, NULL);
    char* bufShiftJis = new char[lengthSJis];
    WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, lengthUnicode + 1, bufShiftJis, lengthSJis, NULL, NULL);
    std::string strSJis(bufShiftJis);
    delete[] bufUnicode;
    delete[] bufShiftJis;

    return strSJis;
  }
}  // namespace sms_accessor