/**
 * @file create_thumbnail.cc
 * @brief create thumbnail command implementation
 * @author kanegon
 * @date 2018/06/11
 */

#include "image/create_thumbnail.h"
#include "image/goyo_image.h"
#include <boost/algorithm/string.hpp>
#include <boost/filesystem.hpp>
#include <boost/filesystem/operations.hpp>
#include <boost/filesystem/path.hpp>
#include <boost/foreach.hpp>
#include <boost/optional.hpp>
#include "util/goyo_app_util.h"
#include <Windows.h>

#define CHECK_OPTIONAL(_x, _msg) \
  if (!_x) {                     \
    throw GoyoException(_msg);   \
  }
using namespace std;
using namespace json11;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

  inline bool EndsWith(std::string const & value, std::string const & ending) {
      if (ending.size() > value.size()) return false;
      return std::equal(ending.rbegin(), ending.rend(), value.rbegin());
  }

  /**
   * @fn
   * GoyoCreateThumbnail
   * @brief constructor
   */
  GoyoCreateThumbnail::GoyoCreateThumbnail() : m_error_type("") {
  }

  /**
   * @fn
   * ~GoyoCreateThumbnail
   * @brief destructor
   */
  GoyoCreateThumbnail::~GoyoCreateThumbnail() {
  }

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  json11::Json GoyoCreateThumbnail::ExecuteCommand(json11::Json& request, string& raw) {
    bool validatedResult = this->validateRequestParam(request);
    // include validate error, return error response
    if(!validatedResult) {
      return this->CreateErrorResponse(request, kErrorInvalidCommandStr, errorMessage);
    }

    // set parameter
    auto imagePath = GoyoAppUtil::Utf8ToUtf16(request["args"]["sourceFile"].string_value());
    auto thumbPath = GoyoAppUtil::Utf8ToUtf16(request["args"]["destFile"].string_value());
    int containerWidth = (int)request["args"]["width"].number_value();
    int containerHeight = (int)request["args"]["height"].number_value();
    int quality = (int)request["args"]["quality"].number_value();

    Json response;
    try {
      // constructor
      goyo_bookrack_accessor::GoyoImage goyoImage(imagePath);

      // thumbnail
      bool result = goyoImage.CreateThumbnail(thumbPath, containerWidth, containerHeight, quality);

      if (result != true) {
        return this->CreateErrorResponse(
          request, kErrorInvalidCommandStr, "Failed to save thumbnail.");
      }
      // create response
      response = json11::Json::object{
        {"updateCount", 1}
      };
    } catch (GoyoException& ex) {
      GoyoErrorLog(ex.what());
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
  bool GoyoCreateThumbnail::validateRequestParam(json11::Json& request) {
    std::string message = "";
    if (!request["args"]["sourceFile"].is_string()) {
      message = "'args.sourceFile' is not specified";
      GoyoErrorLog(message);
      errorMessage = message;
      return false;
    }

    if (!request["args"]["destFile"].is_string()) {
      string message = "'args.destFile' is not specified";
      GoyoErrorLog(message);
      errorMessage = message;
      return false;
    }

    string i = request["args"]["sourceFile"].string_value();
    string t = request["args"]["destFile"].string_value();
    std::transform(i.begin(), i.end(), i.begin(), ::tolower);
    std::transform(t.begin(), t.end(), t.begin(), ::tolower);
    if (EndsWith(i, "tpi") || EndsWith(t, "tpi")) {
      string message = "TPI can not be resized";
      GoyoErrorLog(message);
      errorMessage = message;
      return false;
    }

    if (!request["args"]["width"].is_number()) {
      string message = "'args.width' is not specified";
      GoyoErrorLog(message);
      errorMessage = message;
      return false;
    }

    if (!request["args"]["height"].is_number()) {
      string message = "'args.height' is not specified";
      GoyoErrorLog(message);
      errorMessage = message;
      return false;
    }

    if (!request["args"]["quality"].is_number()) {
      string message = "'args.quality' is not specified";
      GoyoErrorLog(message);
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
  std::string GoyoCreateThumbnail::UTF8toSjis(std::string srcUTF8){
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
}  // namespace goyo_bookrack_accessor