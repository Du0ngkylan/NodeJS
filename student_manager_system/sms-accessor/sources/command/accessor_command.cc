/**
 * @file accessor_command.cc
 * @brief base command implementation
 * @author yonaha
 * @date 2018/02/16
 */

#include "accessor_command.h"
#include <boost/foreach.hpp>
#include <boost/lexical_cast.hpp>
#include <boost/optional.hpp>
#include <boost/property_tree/ini_parser.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include <fstream>
#include <locale>
#include "util/goyo_app_util.h"

using namespace std;
using namespace boost::property_tree::ini_parser;
using namespace json11;
namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {


/**
 * @fn
 * HexString
 * @param(data) byte array
 * @param(len) byte length
 * @brief convert hex string
 * @return hex string
 */
inline string HexString(unsigned char *data, int len) {
  stringstream ss;
  ss << hex;
  for (int i = 0; i < len; ++i) {
    ss << setw(2) << setfill('0') << (int)data[i];
  }
  return ss.str();
}

// /**
//  * @fn
//  * ConvertShiftJisToUnicodeFromFile
//  * @param(path) file path
//  * @return wstring (utf-16le)
//  * @brief convert sjis to utf-16le string
//  */
// static inline wstring ConvertShiftJisToUnicodeFromFile(wstring &path) {
//   // read cp-932
//   ifstream check_ifs(path, ios::in);
//   string str((istreambuf_iterator<char>(check_ifs)),
//              istreambuf_iterator<char>());
//   check_ifs.close();
//   // convert utf16
//   wstring utf16_str = GoyoAppUtil::ShiftJisToUTF16(str);
//   return utf16_str;
// }

/**
 * @fn
 * GoyoAccessorCommand
 * @brief constructor
 */
GoyoAccessorCommand::GoyoAccessorCommand() {}

/**
 * @fn
 * ~GoyoAccessorCommand
 * @brief destructor
 */
GoyoAccessorCommand::~GoyoAccessorCommand() {}

/**
 * @fn
 * CreateErrorResponse
 * @brief create error response
 * @param (request) request json
 * @param (error) error json
 * @return json object
 */
json11::Json GoyoAccessorCommand::CreateErrorResponse(json11::Json &request,
                                                      json11::Json &error) {
  return json11::Json::object{{"request", request}, {"error", error}};
}

/**
 * @fn
 * CreateErrorResponse
 * @brief create error response
 * @param (request) request json
 * @param (type) error type
 * @param (message) error message
 * @return json object
 */
json11::Json GoyoAccessorCommand::CreateErrorResponse(json11::Json &request,
                                                      const string &type,
                                                      const string &message) {
	GoyoErrorLog(message);
  json11::Json error =
      json11::Json::object{{"type", type}, {"message", message}};
  return this->CreateErrorResponse(request, error);
}

/**
 * @fn
 * CreateErrorResponse
 * @brief create error response
 * @param (request) request json
 * @param (type) error type
 * @param (message) error message
 * @return json object
 */
json11::Json GoyoAccessorCommand::CreateErrorResponse(json11::Json &request,
                                                      const string &type,
                                                      const wstring &message) {
  std::string newMessage = GoyoAppUtil::Utf16ToUtf8(message);
	GoyoErrorLog(newMessage);
  json11::Json error =
      json11::Json::object{{"type", type}, {"message", newMessage}};
  return this->CreateErrorResponse(request, error);
}

/**
 * @fn
 * CreateSRect
 * @brief create rectangle
 * @param (rect) rectangle
 * @return json object
 */
json11::Json GoyoAccessorCommand::CreateSRect(SRECT &srect) {
  return json11::Json::object{
      {"left", srect.left},
      {"top", srect.top},
      {"right", srect.right},
      {"bottom", srect.bottom},
  };
}

/**
 * @fn
 * ConvertColorRef
 * @brief convert color string
 * @param (color_ref) color reference
 * @return color hex string
 */
string GoyoAccessorCommand::ConvertColorRef(COLORREF &color_ref) {
  // COLORREF ref = RGB(red, green, blue);
  unsigned char b[3];
  b[0] = GetRValue(color_ref);
  b[1] = GetGValue(color_ref);
  b[2] = GetBValue(color_ref);
  string hex = "#" + HexString(b, 3);
  return hex;
}

/**
 * @fn
 * ConvertColorRef
 * @brief convert color string
 * @param (hex_color) color reference
 * @return coloref
 */
COLORREF GoyoAccessorCommand::ConvertHexColor(string hex_color) {
  hex_color = hex_color.substr(1);
  BYTE r;
  BYTE g;
  BYTE b;
  if (hex_color.length() == 6) {
    r = static_cast<BYTE>(strtol(hex_color.substr(0, 2).c_str(), NULL, 16));
    g = static_cast<BYTE>(strtol(hex_color.substr(2, 2).c_str(), NULL, 16));
    b = static_cast<BYTE>(strtol(hex_color.substr(4, 2).c_str(), NULL, 16));
  } else {
    r = static_cast<BYTE>(strtol(hex_color.substr(0, 1).c_str(), NULL, 16));
    g = static_cast<BYTE>(strtol(hex_color.substr(1, 1).c_str(), NULL, 16));
    b = static_cast<BYTE>(strtol(hex_color.substr(2, 1).c_str(), NULL, 16));
  }
  return RGB(r, g, b);
}

/**
 * @fn
 * LogFont
 * @brief get log font from hex string
 * @param (hex_string) hex string
 * @return log font
 */
LOGFONT GoyoAccessorCommand::LogFont(string hex_string) {
  LOGFONT log_font;
  vector<char> bytes = GoyoAppUtil::HexToBytes(hex_string);
  memcpy(&log_font, reinterpret_cast<const LOGFONT *>(&bytes[0]),
         sizeof(LOGFONT));
  return log_font;
}

/**
 * @fn
 * LogFontInHexString
 * @brief get log font in hex string
 * @param (log_font) log font
 * @return hex string of log font
 */
string GoyoAccessorCommand::LogFontInHexString(LOGFONT &log_font) {
  unsigned char font[sizeof(LOGFONT)];
  memcpy(&font, reinterpret_cast<const unsigned char *>(&log_font),
         sizeof(LOGFONT));
  return HexString(font, sizeof(LOGFONT));
}

/**
 * @fn
 * CreateFont
 * @brief create font
 * @param (log_font) log font
 * @param (font_color) when not set, empty
 * @return font object
 */
json11::Json::object GoyoAccessorCommand::CreateFont(LOGFONT &log_font, std::string font_color) {
  wstring f(log_font.lfFaceName);
  string font_name = GoyoAccessorCommand::ConvertWstring(f);
  int font_weight = log_font.lfWeight;

  int font_size = 0;
  HDC hdc = GetDC(NULL);
  if (hdc != NULL) {
    // When the mapping mode is mm_Text (which it usually is), and when the
    // lfHeight field is positive, it already gives the height in points. When
    // it's negative, the units are pixels.
    if (log_font.lfHeight < 0) {
      font_size =
          MulDiv(-log_font.lfHeight, 72, GetDeviceCaps(hdc, LOGPIXELSY));
    } else {
      font_size = log_font.lfHeight;
    }
    // <-> lfHeight = -MulDiv(font_size, GetDeviceCaps(hdchDC, LOGPIXELSY), 72);
    ReleaseDC(NULL, hdc);
  }

  string text_decoration = "";
  if (log_font.lfUnderline) {
    text_decoration += "underline; ";
  }
  if (log_font.lfStrikeOut) {
    text_decoration += "line-through; ";
  }
  string font_style = "";
  if (log_font.lfItalic) {
    font_style = "italic";
  }
  string hex_font = LogFontInHexString(log_font);

  return json11::Json::object{{"fontName", font_name},
                              {"fontStyle", font_style},
                              {"fontSize", font_size},
                              {"fontWeight", font_weight},
                              {"textDecoration", text_decoration},
                              {"fontBinary", hex_font},
                              {"fontColor", font_color },
  };
}

/**
 * @fn
 * ParseJsonFile
 * @brief parse json file
 * @param (file) file path
 * @return json object
 */
json11::Json GoyoAccessorCommand::ParseJsonFile(wstring file) {
  // auto ss = GoyoAppUtil::ReadUnicodeFile(file, W_MODE_READ_UTF8);
  // auto str = ss.str();

  // string content = GoyoAppUtil::Utf16ToUtf8(str);
  wifstream wif(file);
  wif.imbue(locale(locale::empty(), new codecvt_utf8<wchar_t>));
  wstringstream wss;
  wss << wif.rdbuf();
  wif.close();

  string content = GoyoAccessorCommand::ConvertWstring(wss.str());
  string err;

  auto json = json11::Json::parse(content, err);
  if (!err.empty()) {
    throw GoyoException(err);
  }
  return json;
}

  /**
   * @fn
   * WriteJsonFile
   * @brief parse json file
   * @param (json) json
   * @param (file) file path
   */
  void GoyoAccessorCommand::WriteJsonFile(json11::Json json,
                                          std::wstring file) {

    wofstream wof(file);
    wof.imbue(locale(locale::empty(), new codecvt_utf8<wchar_t>));
    wstring ws = GoyoAccessorCommand::ConvertString(json.dump());
    wof << ws;
    wof.close();
    
  }

/**
 * @fn
 * GetGoyoAppDirectory
 * @brief get application directory
 * @return goyo application directory
 */
wstring GoyoAccessorCommand::GetGoyoAppDirectory() {
  wstring app_goyo_dir(
      _wgetenv(goyo_bookrack_accessor::kEnvAppDirName.c_str()));
  return app_goyo_dir;
}

/**
 * @fn
 * GetGoyoAppDataDirectory
 * @brief get application data directory
 * @return goyo application data directory
 */
wstring GoyoAccessorCommand::GetGoyoAppDataDirectory() {
  wstring app_goyo_dir = this->GetGoyoAppDirectory();
  return app_goyo_dir;
}

/**
 * @fn
 * GetGoyoBookrackDirectory
 * @param(construction_id) construction id
 * @brief get bookrack directory
 * @return goyo bookrack directory : empty - otherwise error
 */
wstring GoyoAccessorCommand::GetGoyoBookrackDirectory(
    wstring &construction_id) {
  throw GoyoException("unsupported function!");
}

/**
 * @fn
 * GetGoyoWorkDirectory
 * @brief get application resource base directory
 * @return goyo application resource base directory
 */
wstring GoyoAccessorCommand::GetGoyoWorkDirectory() {
  wstring work_dir(_wgetenv(goyo_bookrack_accessor::kEnvWorkDirName.c_str()));
  auto pos = work_dir.find(L".asar");
  if (pos != wstring::npos) {
    work_dir.replace(pos, 5, L".asar.unpacked");
  }
  // sjis
  return work_dir;
}

/**
 * @fn
 * GetGoyoDatabaseRootDirectory
 * @brief get database root directory
 * @return goyo database root directory
 */
wstring GoyoAccessorCommand::GetGoyoDatabaseRootDirectory() {
  fs::wpath work_dir(this->GetGoyoWorkDirectory());
  fs::wpath db_root = work_dir / L"databases";
  return db_root.wstring();
}

/**
 * @fn
 * GetGoyoBookrackResourcesDirectory
 * @brief get bookrack resources directory
 * @param work_dir working directory
 * @return goyo bookrack resources directory
 */
wstring GoyoAccessorCommand::GetGoyoBookrackResourcesDirectory(wstring work_dir) {
  fs::wpath work_dir_path(work_dir);
  fs::wpath resource_dir = work_dir_path / L"ba_resources";
  return resource_dir.wstring();
}

/**
 * @fn
 * ExistsFile
 * @brief exists file
 * @param (path) file path
 * @return true - exists , false - not exists
 */
bool GoyoAccessorCommand::ExistsFile(wstring &path) {
  return GoyoAppUtil::ExistsFile(path);
}

/**
 * @fn
 * FileSize
 * @brief get file size
 * @param (path) file path
 * @param (number_of_files) number of files
 * @return file size
 */
unsigned long long GoyoAccessorCommand::GetTotalFileSize(wstring path,
                                                         int *number_of_files) {
  return GoyoAppUtil::GetTotalFileSize(path, number_of_files);
}

/**
 * @fn
 * GetFilesInDirectory
 * @brief get file size
 * @param (full_path) dir path
 * @param (ext_filter) extension filter
 * @return files in directory
 */
std::vector<fs::path> GoyoAccessorCommand::GetFilesInDirectory(
    fs::path full_path, fs::path *ext_filter) {
  return GoyoAppUtil::GetFilesInDirectory(full_path, ext_filter);
}

/**
 * @fn
 * CreateDirectory
 * @brief create directory
 * @param (path) file path
 * @return true - created , otherwise error
 */
bool GoyoAccessorCommand::CreateDirectory(wstring &path) {
  try {
    fs::create_directory(path);
    fs::permissions(path, fs::perms::others_all);
  } catch (fs::filesystem_error &ex) {
    throw GoyoException(ex.what());
  }
  return true;
}

/**
 * @fn
 * Utf8ToUtf16
 * @brief convert utf8 to utf16
 * @param (utf8) string
 */
wstring GoyoAccessorCommand::Utf8ToUtf16(const string &utf8) {
  return GoyoAppUtil::Utf8ToUtf16(utf8);
}

/**
 * @fn
 * ReadUnicodeIni
 * @brief read unicode ini file
 * @param (path) file path
 * @return property tree
 */
boost::property_tree::wptree GoyoAccessorCommand::ReadUnicodeIni(
    wstring &path) {
  return GoyoAppUtil::ReadUnicodeIni(path);
}

/**
 * @fn
 * WriteUnicodeIni
 * @brief write unicode ini file
 * @param (path) file path
 * @return 1 if success, 0 if not success
 */
int GoyoAccessorCommand::WriteUnicodeIni(wstring &path,
                                         boost::property_tree::wptree &pt) {
  return GoyoAppUtil::WriteUnicodeIni(path, pt);
}

/**
 * @fn
 * ReadUnicodeXML
 * @brief read unicode xml file
 * @param path file path
 * @return property tree
 */
boost::property_tree::wptree GoyoAccessorCommand::ReadUnicodeXML(
    wstring &path) {

  auto ss = GoyoAppUtil::ReadUnicodeFile(path, W_MODE_READ_UTF16LE);

  boost::property_tree::wptree pt;
  read_xml(ss, pt, boost::property_tree::xml_parser::trim_whitespace);

  return pt;
}

/**
 * @fn
 * WriteUnicodeXML
 * @brief write unicode xml file
 * @param (path) file path
 * @return 1 if success, 0 if not success
 */
int GoyoAccessorCommand::WriteUnicodeXML(wstring path,
                                         boost::property_tree::wptree pt) {
  try {
    wstringstream ss;
    boost::property_tree::xml_writer_settings<wstring> settings(' ', 1, L"UTF-16LE");
    write_xml(ss, pt, settings);
    GoyoAppUtil::WriteUnicodeFile(path, W_MODE_WRITE_UTF16LE, ss);
  } catch (ini_parser_error &ex) {
    throw GoyoException(ex.what());
  }
  return 1;
}

/**
 * @fn
 * ConvertWstring
 * @brief convert wstring to string
 * @param (str) string
 * @return converted string
 */
string GoyoAccessorCommand::ConvertWstring(wstring &str) {
  return GoyoAppUtil::Utf16ToUtf8(str);
}

/**
 * @fn
 * ConvertWstring
 * @brief convert wstring to string
 * @param (str) string
 * @return converted string
 */
string GoyoAccessorCommand::ConvertWstring(boost::optional<wstring> &str) {
  return ConvertWstring(str.get());
}

/**
 * @fn
 * ConvertString
 * @brief convert string to wstring
 * @param (str) string
 * @return converted wstring
 */
wstring GoyoAccessorCommand::ConvertString(string &str) {
  return GoyoAppUtil::Utf8ToUtf16(str);
}

/**
 * @fn
 * ConvertFormatDateTime
 * @brief convert format date string
 * @param (str) string
 * @return converted string
 */
string GoyoAccessorCommand::ConvertFormatDateTime(string &str) {
  if (str.length() < 14) {
    return str;
  }
  string y = str.substr(0, 4);
  string m = str.substr(4, 2);
  string d = str.substr(6, 2);

  string h = str.substr(8, 2);
  string mi = str.substr(10, 2);
  string s = str.substr(12, 2);
  return y + "/" + m + "/" + d + " " + h + ":" + mi + ":" + s;
}

/**
 * @fn
 * ConvertFormatDate
 * @brief convert format date string
 * @param (str) string
 * @return converted string
 */
string GoyoAccessorCommand::ConvertFormatDate(string &str) {
  if (str.length() < 8) {
    return str;
  }
  string y = str.substr(0, 4);
  string m = str.substr(4, 2);
  string d = str.substr(6, 2);
  return y + "/" + m + "/" + d;
}

/**
 * @fn
 * ConvertFormatDate
 * @brief convert format date string
 * @param (str) string
 * @return converted string
 */
string GoyoAccessorCommand::ConvertFormatDate(boost::optional<wstring> &str) {
  return GoyoAccessorCommand::ConvertFormatDate(
      GoyoAccessorCommand::ConvertWstring(str));
}

std::wstring GoyoAccessorCommand::GetWStringFJson(const json11::Json &json) {
  if (json.is_string())
    return Utf8ToUtf16(json.string_value());
  else
    throw GoyoException(json.dump() + " String value invalid");
}

std::string GoyoAccessorCommand::GetStringFJson(const json11::Json &json) const {
  if (json.is_string())
    return json.string_value();
  else
    throw GoyoException(json.dump() + " String value invalid");
}

int GoyoAccessorCommand::GetIntFJson(const json11::Json &json) const {
  if (json.is_number())
    return json.int_value();
  else
    throw GoyoException(json.dump() + " int value invalid");
}

bool GoyoAccessorCommand::GetBoolFJson(const json11::Json &json) const{
  if (json.is_bool())
    return json.bool_value();
  else
    throw GoyoException(json.dump() + " bool value invalid");
}

json11::Json::object GoyoAccessorCommand::GetObjFJson(const json11::Json &json) const{
  if (json.is_object())
    return json.object_items();
  else
    throw GoyoException(json.dump() + " Object value invalid");
}

  json11::Json::array GoyoAccessorCommand::GetArrayFJson(const json11::Json &json) const{
  if (json.is_array())
    return json.array_items();
  else
    throw GoyoException(json.dump() + " Array value invalid");
}

/**
 * @fn
 * CreateGuid
 * @brief create guid
 * @return guid string
 */
string GoyoAccessorCommand::CreateGuid() { return GoyoAppUtil::CreateGuid(); }


/**
* @fn
* OutputProgress
* @brief output progress
* @param status
*/
void GoyoAccessorCommand::OutputProgress(Json::object &status) {
  Json progress = Json::object{
    { "progress", status }
  };
  cout << progress.dump() << endl;
}

/**
* @fn
* ReleaseDatabases
* @brief release databases
* @param is_shared shared construction : true, otherwise : false
* @param dbs target databases
*/
void GoyoAccessorCommand::ReleaseDatabases(const bool is_shared, std::vector<goyo_db_manager::manager::GoyoBaseDatabase *> &dbs) {
  // not close
  // if (is_shared) {
  //   for (auto &db : dbs) {
  //     db->ReleaseDatabaseFromDBPool();
  //   }
  // }
}

/**
* @fn
* ValidateDiskFreeSpaceSize
* @brief validate disk free space size
* @param dir
* @throw GoyoAppUtil::GetDiskFreeSpaceSize < EFFECTIVE_DISK_MB_SIZE
*/
void GoyoAccessorCommand::ValidateDiskFreeSpaceSize(std::wstring &dir) {
  auto size_mb = GoyoAppUtil::GetDiskFreeSpaceSize(dir);
  if (size_mb < EFFECTIVE_DISK_MB_SIZE) {
    throw GoyoException("Disk space is insufficient.(free : " + to_string(size_mb) + "MB)");
  }
}

}  // namespace goyo_bookrack_accessor
