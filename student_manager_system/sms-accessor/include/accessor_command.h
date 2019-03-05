/**
 * @file accessor_command.h
 * @brief accessor base command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_
#define SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_

#include <boost/filesystem.hpp>
#include "common.h"
#include "sms_db_if.h"


namespace fs = boost::filesystem;

namespace sms_accessor {

// error types
const std::string kErrorInternalStr = "INTERNAL_ERROR";
const std::string kErrorInvalidCommandStr = "INVALID_COMMAND";
const std::string kErrorInvalidFormatStr = "INVALID_DATA_FORMAT";
const std::string kErrorIOStr = "IO_ERROR";
const std::string kErrorOtherStr = "OTHER_ERROR";

// app data folder environment name
const std::wstring kEnvAppDirName = L"SMS_APP_DATA";
const std::wstring kEnvWorkDirName = L"SMS_WORK_DIR";

// const std::wstring PROFILE = L"\\Profile.dat";
// const std::wstring ALBUM_FILE = L"\\MMALBUM";
// const std::wstring BOOKRACK_PROFILE = L"\\BKSPROF.DAT";
// const std::wstring BOX_PROFILE = L"\\BOXPROF.DAT";
// const std::wstring LAYOUT_FILE = L"\\PageCfg";
// const std::wstring PHOTO_INF = L"\\kphotoInf.ini";

const int DEF_THUMB_WIDTH = 600;
const int DEF_THUMB_HEIGHT = 480;
const int DEF_THUMB_QUALITY = 90;

const unsigned long long EFFECTIVE_DISK_MB_SIZE = 100;


/**
 * @class SmsAccessorCommand
 * @brief sms accessor base command
 */
class SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsAccessorCommand
   * @brief constructor
   */
  SmsAccessorCommand();

  /**
   * @fn
   * SmsAccessorCommand
   * @brief destructor
   */
  virtual ~SmsAccessorCommand();

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
   * @fn
   * ConvertColorRef
   * @brief convert color string
   * @param (color_ref) color reference
   * @return color hex string
   */
  static std::string ConvertColorRef(COLORREF &color_ref);

  /**
   * @fn
   * ConvertColorRef
   * @brief convert color string
   * @param (hex_color) color reference
   * @return coloref
   */
  static COLORREF SmsAccessorCommand::ConvertHexColor(std::string hex_color);

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
   * GetSmsBookrackDirectory
   * @param(construction_id) construction id
   * @brief get bookrack directory
   * @return sms bookrack directory : empty - otherwise error
   */
  std::wstring GetSmsBookrackDirectory(std::wstring &construction_id);

  /**
   * @fn
   * GetSmsWorkDirectory
   * @brief get application resource base directory
   * @return sms application resource base directory
   */
  std::wstring GetSmsWorkDirectory();

  /**
   * @fn
   * GetSmsDatabaseRootDirectory
   * @brief get database root directory
   * @return sms database root directory
   */
  std::wstring GetSmsDatabaseRootDirectory();

  /**
   * @fn
   * GetSmsBookrackResourcesDirectory
   * @brief get bookrack resources directory
   * @param work_dir working directory
   * @return sms bookrack resources directory
   */
  static std::wstring GetSmsBookrackResourcesDirectory(std::wstring work_dir);

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
   * GetFilesInDirectory
   * @brief get file size
   * @param (full_path) dir path
   * @param (ext_filter) extension filter
   * @return files in directory
   */
  std::vector<fs::path> GetFilesInDirectory(fs::path full_path,
                                            fs::path *ext_filter = nullptr);

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
   * ConvertWstring
   * @brief convert wstring to string
   * @param (str) string
   * @return converted string
   */
  static std::string ConvertWstring(boost::optional<std::wstring> &str);

  /**
   * @fn
   * ConvertWstring
   * @brief convert wstring to string
   * @param (str) string
   * @return converted string
   */
  static std::string ConvertWstring(std::wstring &str);

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
  static std::string ConvertFormatDate(boost::optional<std::wstring> &str);

  /**
   * @fn
   * Utf8ToUtf16
   * @brief convert utf8 to utf16
   * @param (utf8) string
   */
  std::wstring Utf8ToUtf16(const std::string &utf8);

  /**
   * @fn
   * ReadUnicodeIni
   * @brief read unicode ini file
   * @param (path) file path
   * @return property tree
   */
  boost::property_tree::wptree ReadUnicodeIni(std::wstring &path);

  /**
   * @fn
   * WriteUnicodeIni
   * @brief write unicode ini file
   * @param (path) file path
   * @return 1 if success, 0 if not success
   */
  int WriteUnicodeIni(std::wstring &path, boost::property_tree::wptree &pt);

  /**
   * @fn
   * ReadUnicodeXML
   * @brief read unicode xml file
   * @param (path) file path
   * @return property tree
   */
	static boost::property_tree::wptree ReadUnicodeXML(std::wstring &path);

  /**
   * @fn
   * WriteUnicodeXML
   * @brief write unicode xml file
   * @param (path) file path
   * @return 1 if success, 0 if not success
   */
	static int WriteUnicodeXML(std::wstring path, boost::property_tree::wptree pt);

  /**
   * @fn
   * CreateGuid
   * @brief create guid
   * @return guid string
   */
  std::string CreateGuid();

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

  /**
  * @fn
  * ReleaseDatabases
  * @brief release databases
  * @param is_shared shared construction : true, otherwise : false
  * @param dbs target databases
  */
  static void ReleaseDatabases(const bool is_shared, std::vector<Sms_db_manager::manager::SmsBaseDatabase *> &dbs);

  /**
  * @fn
  * ValidateDiskFreeSpaceSize
  * @brief validate disk free space size
  * @param dir
  * @throw SmsAppUtil::GetDiskFreeSpaceSize < EFFECTIVE_DISK_MB_SIZE
  */
  static void ValidateDiskFreeSpaceSize(std::wstring &dir);
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_ACCESSOR_COMMAND_H_
