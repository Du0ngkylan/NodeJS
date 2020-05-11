/**
 * @file accessor_command.h
 * @brief accessor base command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_
#define ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_

#include "common.h"

namespace accessor {

// error types
const std::string kErrorInternalStr = "INTERNAL_ERROR";
const std::string kErrorInvalidCommandStr = "INVALID_COMMAND";
const std::string kErrorInvalidFormatStr = "INVALID_DATA_FORMAT";
const std::string kErrorIOStr = "IO_ERROR";
const std::string kErrorOtherStr = "OTHER_ERROR";

// app data folder environment name
const std::wstring kEnvAppDirName = L"SMS_APP_DATA";
const std::wstring kEnvWorkDirName = L"SMS_WORK_DIR";

/**
 * @class AccessorCommand
 * @brief sms accessor base command
 */
class AccessorCommand {
 public:
  /**
   * @fn
   * AccessorCommand
   * @brief constructor
   */
  AccessorCommand();

  /**
   * @fn
   * AccessorCommand
   * @brief destructor
   */
  virtual ~AccessorCommand();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json
   * @param (raw) raw string
   */
  virtual json11::Json ExecuteCommand(json11::Json &request, std::string &raw) {
    return json11::Json();
  }

  /**
   * @fn
   * CreateErrorResponse
   * @brief create error response
   * @param (request) request json
   * @param (error) error json
   * @return json object
   */
  json11::Json CreateErrorResponse(json11::Json &request, json11::Json &error);

  /**
   * @fn
   * CreateErrorResponse
   * @brief create error response
   * @param (request) request json
   * @param (type) error type
   * @param (message) error message
   * @return json object
   */
  json11::Json CreateErrorResponse(json11::Json &request,
                                   const std::string &type,
                                   const std::string &message);

  /**
   * @fn
   * CreateErrorResponse
   * @brief create error response
   * @param (request) request json
   * @param (type) error type
   * @param (message) error message
   * @return json object
   */
  json11::Json CreateErrorResponse(json11::Json &request,
                                  const std::string &type,
                                  const std::wstring &message);

 protected:

  /**
   * LogFont
   * @brief get log font from hex string
   * @param (hex_string) hex string
   * @return log font
   */
  static LOGFONT LogFont(std::string hex_string);

  /**
   * @fn
   * LogFontInHexString
   * @brief get log font in hex string
   * @param (log_font) log font
   * @return hex string of log font
   */
  static std::string LogFontInHexString(LOGFONT &log_font);

  /**
   * @fn
   * CreateSRect
   * @brief create rectangle
   * @param (rect) rectangle
   * @return json object
   */
  json11::Json CreateSRect(SRECT &rect);

  /**
  * @fn
  * CreateFont
  * @brief create font
  * @param (log_font) log font
  * @param (font_color) when not set, empty
  * @return font object
  */
  static json11::Json::object CreateFont(LOGFONT &log_font, std::string font_color);

  /**
   * @fn
   * ParseJsonFile
   * @brief parse json file
   * @param (file) file path
   * @return json object
   */
  static json11::Json ParseJsonFile(std::wstring file);

  /**
   * @fn
   * WriteJsonFile
   * @brief parse json file
   * @param (json) json
   * @param (file) file path
   */
  static void WriteJsonFile(json11::Json json, std::wstring file);

  /**
   * @fn
   * GetSmsAppDirectory
   * @brief get application directory
   * @return sms application directory
   */
  std::wstring GetSmsAppDirectory();

  /**
   * @fn
   * GetSmsAppDataDirectory
   * @brief get application data directory
   * @return sms application data directory
   */
  std::wstring GetSmsAppDataDirectory();

  /**
   * @fn
   * ExistsFile
   * @brief exists file
   * @param (path) file path
   * @return true - exists , false - not exists
   */
	static bool ExistsFile(std::wstring &path);

  /**
   * @fn
   * GetTotalFileSize
   * @brief get file size
   * @param (path) file path, directory path or asterisk file name, ex:
   * parent_dir//*.extension
   * @param (number_of_files) number of files
   * @return file size
   */
  unsigned long long GetTotalFileSize(std::wstring path, int *number_of_files = nullptr);

  /**
   * @fn
   * CreateDirectory
   * @brief create directory
   * @param (path) file path
   * @return true - created , otherwise error
   */
  bool CreateDirectory(std::wstring &path);

  /**
   * @fn
   * ConvertString
   * @brief convert string to wstring
   * @param (str) string
   * @return converted wstring
   */
  static std::wstring ConvertString(std::string &str);

  /**
   * @fn
   * ConvertFormatDateTime
   * @brief convert format date time string
   * @param (str) string
   * @return converted string
   */
  static std::string ConvertFormatDateTime(std::string &str);

  /**
   * @fn
   * ConvertFormatDate
   * @brief convert format date string
   * @param (str) string
   * @return converted string
   */
  static std::string ConvertFormatDate(std::string &str);

  /**
  * @fn
  * OutputProgress
  * @brief output progress
  * @param status
  */
  static void OutputProgress(json11::Json::object &status);

  std::wstring GetWStringFJson(const json11::Json& json);

  std::string GetStringFJson(const json11::Json& json) const;

  int GetIntFJson(const json11::Json& json) const;

  bool GetBoolFJson(const json11::Json& json) const;

  json11::Json::object GetObjFJson(const json11::Json& json) const;

  json11::Json::array GetArrayFJson(const json11::Json& json) const;
};

}  // namespace accessor

#endif  // ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_
