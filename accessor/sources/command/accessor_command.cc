/**
 * @file accessor_command.cc
 * @brief base command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "accessor_command.h"
#include <fstream>
#include <locale>
#include "util/sms_app_util.h"

using namespace std;
using namespace json11;

namespace accessor {

/**
 * @fn
 * AccessorCommand
 * @brief constructor
 */
AccessorCommand::AccessorCommand() {}

/**
 * @fn
 * ~AccessorCommand
 * @brief destructor
 */
AccessorCommand::~AccessorCommand() {}

/**
 * @fn
 * CreateErrorResponse
 * @brief create error response
 * @param (request) request json
 * @param (error) error json
 * @return json object
 */
json11::Json AccessorCommand::CreateErrorResponse(json11::Json &request, json11::Json &error) {
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
json11::Json AccessorCommand::CreateErrorResponse(json11::Json &request, const string &type, const string &message) {
	// SmsErrorLog(message);
  json11::Json error = json11::Json::object{{"type", type}, {"message", message}};
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
json11::Json AccessorCommand::CreateErrorResponse(json11::Json &request, const string &type, const wstring &message) {
  json11::Json error = json11::Json::object{{"type", type}, {"message", message}};
  return this->CreateErrorResponse(request, error);
}

/**
 * @fn
 * CreateSRect
 * @brief create rectangle
 * @param (rect) rectangle
 * @return json object
 */
json11::Json AccessorCommand::CreateSRect(SRECT &srect) {
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
// string AccessorCommand::ConvertColorRef(COLORREF &color_ref) {
//   // COLORREF ref = RGB(red, green, blue);
//   unsigned char b[3];
//   b[0] = GetRValue(color_ref);
//   b[1] = GetGValue(color_ref);
//   b[2] = GetBValue(color_ref);
//   string hex = "#" + HexString(b, 3);
//   return hex;
// }

/**
 * @fn
 * ConvertColorRef
 * @brief convert color string
 * @param (hex_color) color reference
 * @return coloref
 */
// COLORREF AccessorCommand::ConvertHexColor(string hex_color) {
//   hex_color = hex_color.substr(1);
//   BYTE r;
//   BYTE g;
//   BYTE b;
//   if (hex_color.length() == 6) {
//     r = static_cast<BYTE>(strtol(hex_color.substr(0, 2).c_str(), NULL, 16));
//     g = static_cast<BYTE>(strtol(hex_color.substr(2, 2).c_str(), NULL, 16));
//     b = static_cast<BYTE>(strtol(hex_color.substr(4, 2).c_str(), NULL, 16));
//   } else {
//     r = static_cast<BYTE>(strtol(hex_color.substr(0, 1).c_str(), NULL, 16));
//     g = static_cast<BYTE>(strtol(hex_color.substr(1, 1).c_str(), NULL, 16));
//     b = static_cast<BYTE>(strtol(hex_color.substr(2, 1).c_str(), NULL, 16));
//   }
//   return RGB(r, g, b);
// }

/**
 * @fn
 * LogFont
 * @brief get log font from hex string
 * @param (hex_string) hex string
 * @return log font
//  */
// LOGFONT AccessorCommand::LogFont(string hex_string) {
//   LOGFONT log_font;
//   vector<char> bytes = SmsAppUtil::HexToBytes(hex_string);
//   memcpy(&log_font, reinterpret_cast<const LOGFONT *>(&bytes[0]),
//          sizeof(LOGFONT));
//   return log_font;
// }

/**
 * @fn
 * LogFontInHexString
 * @brief get log font in hex string
 * @param (log_font) log font
 * @return hex string of log font
 */
// string AccessorCommand::LogFontInHexString(LOGFONT &log_font) {
//   unsigned char font[sizeof(LOGFONT)];
//   memcpy(&font, reinterpret_cast<const unsigned char *>(&log_font),
//          sizeof(LOGFONT));
//   return HexString(font, sizeof(LOGFONT));
// }

/**
 * @fn
 * CreateFont
 * @brief create font
 * @param (log_font) log font
 * @param (font_color) when not set, empty
 * @return font object
 */
// json11::Json::object AccessorCommand::CreateFont(LOGFONT &log_font, std::string font_color) {
//   wstring f(log_font.lfFaceName);
//   string font_name = AccessorCommand::ConvertWstring(f);
//   int font_weight = log_font.lfWeight;

//   int font_size = 0;
//   HDC hdc = GetDC(NULL);
//   if (hdc != NULL) {
//     // When the mapping mode is mm_Text (which it usually is), and when the
//     // lfHeight field is positive, it already gives the height in points. When
//     // it's negative, the units are pixels.
//     if (log_font.lfHeight < 0) {
//       font_size =
//           MulDiv(-log_font.lfHeight, 72, GetDeviceCaps(hdc, LOGPIXELSY));
//     } else {
//       font_size = log_font.lfHeight;
//     }
//     // <-> lfHeight = -MulDiv(font_size, GetDeviceCaps(hdchDC, LOGPIXELSY), 72);
//     ReleaseDC(NULL, hdc);
//   }

//   string text_decoration = "";
//   if (log_font.lfUnderline) {
//     text_decoration += "underline; ";
//   }
//   if (log_font.lfStrikeOut) {
//     text_decoration += "line-through; ";
//   }
//   string font_style = "";
//   if (log_font.lfItalic) {
//     font_style = "italic";
//   }
//   string hex_font = LogFontInHexString(log_font);

//   return json11::Json::object{{"fontName", font_name},
//                               {"fontStyle", font_style},
//                               {"fontSize", font_size},
//                               {"fontWeight", font_weight},
//                               {"textDecoration", text_decoration},
//                               {"fontBinary", hex_font},
//                               {"fontColor", font_color },
//   };
// }

/**
 * @fn
 * ParseJsonFile
 * @brief parse json file
 * @param (file) file path
 * @return json object
 */
json11::Json AccessorCommand::ParseJsonFile(wstring file) {
  //  auto ss = SmsAppUtil::ReadUnicodeFile(file, W_MODE_READ_UTF8);
  //  auto str = ss.str();

  //  string content = SmsAppUtil::Utf16ToUtf8(str);
  //  wifstream wif(file);
  //  wif.imbue(locale(locale::empty(), new codecvt_utf8<wchar_t>));
  //  wstringstream wss;
  //  wss << wif.rdbuf();
  //  wif.close();

   string content;// = AccessorCommand::ConvertWstring(wss.str());
   string err;

   auto json = json11::Json::parse(content, err);
   if (!err.empty()) {
    //  throw SmsException(err);
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
  void AccessorCommand::WriteJsonFile(json11::Json json,
                                          std::wstring file) {

    // wofstream wof(file);
    // wof.imbue(locale(locale::empty(), new codecvt_utf8<wchar_t>));
    // wstring ws = AccessorCommand::ConvertString(json.dump());
    // wof << ws;
    // wof.close();
    
  }

/**
 * @fn
 * GetSmsAppDirectory
 * @brief get application directory
 * @return Sms application directory
 */
wstring AccessorCommand::GetSmsAppDirectory() {
   wstring app_Sms_dir(
       _wgetenv(accessor::kEnvAppDirName.c_str()));
   return app_Sms_dir;
}

/**
 * @fn
 * GetSmsAppDataDirectory
 * @brief get application data directory
 * @return Sms application data directory
 */
wstring AccessorCommand::GetSmsAppDataDirectory() {
  wstring app_Sms_dir = this->GetSmsAppDirectory();
  return app_Sms_dir;
}

/**
 * @fn
 * ExistsFile
 * @brief exists file
 * @param (path) file path
 * @return true - exists , false - not exists
 */
bool AccessorCommand::ExistsFile(wstring &path) {
  return true;
}

/**
 * @fn
 * ConvertFormatDateTime
 * @brief convert format date string
 * @param (str) string
 * @return converted string
 */
string AccessorCommand::ConvertFormatDateTime(string &str) {
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
string AccessorCommand::ConvertFormatDate(string &str) {
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
 //string AccessorCommand::ConvertFormatDate(boost::optional<wstring> &str) {
 //  return AccessorCommand::ConvertFormatDate(
 //      AccessorCommand::ConvertWstring(str));
 //}

 std::wstring AccessorCommand::GetWStringFJson(const json11::Json &json) {
   if (json.is_string())
     return SmsAppUtil::Utf8ToUtf16(json.string_value());
   else
     throw SmsException(json.dump() + " String value invalid");
 }

 std::string AccessorCommand::GetStringFJson(const json11::Json &json) const {
   if (json.is_string())
     return json.string_value();
   else
     throw SmsException(json.dump() + " String value invalid");
 }

 int AccessorCommand::GetIntFJson(const json11::Json &json) const {
   if (json.is_number())
     return json.int_value();
   else
     throw SmsException(json.dump() + " int value invalid");
 }

 bool AccessorCommand::GetBoolFJson(const json11::Json &json) const{
   if (json.is_bool())
     return json.bool_value();
   else
     throw SmsException(json.dump() + " bool value invalid");
 }

 json11::Json::object AccessorCommand::GetObjFJson(const json11::Json &json) const{
   if (json.is_object())
     return json.object_items();
   else
     throw SmsException(json.dump() + " Object value invalid");
 }

   json11::Json::array AccessorCommand::GetArrayFJson(const json11::Json &json) const{
   if (json.is_array())
     return json.array_items();
   else
     throw SmsException(json.dump() + " Array value invalid");
 }

 /**
 * @fn
 * OutputProgress
 * @brief output progress
 * @param status
 */
 void AccessorCommand::OutputProgress(Json::object &status) {
   Json progress = Json::object{
     { "progress", status }
   };
   cout << progress.dump() << endl;
 }

}  // namespace accessor
