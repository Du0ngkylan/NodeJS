/**
 * @file sms_app_util.cc
 * @brief application utility implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "util/sms_app_util.h"
#include <fstream>
#include <iomanip>
#include <locale>
#include <regex>
#include "common.h"
#include "except/sms_exception.h"
#include "accessor_command.h"

using namespace std;

namespace accessor {

const int HASH_LENGTH = 32;

/**
 * @fn
 * SmsAppUtil
 * @brief constructor
 */
SmsAppUtil::SmsAppUtil() {}

/**
 * @fn
 * ~SmsAppUtil
 * @brief destructor
 */
SmsAppUtil::~SmsAppUtil() {}

/**
 * @fn
 * ExistsFile
 * @brief exists file
 * @param (path) file path
 * @return true - exists , false - otherwise error
 */
bool SmsAppUtil::ExistsFile(wstring &path) {
  return _waccess(path.c_str(), 6) == 0;
}


/**
 * @fn
 * GetTotalFileSize
 * @brief get file size
 * @param (path) file path
 * @param (number_of_files) number of files
 * @return size of files or directory
 */
unsigned long long SmsAppUtil::GetTotalFileSize(wstring path, int *number_of_files) {
  unsigned long long filesize = 0;
  return filesize;
}

 /**
  * @fn
  * GetTotalDirectorySize
  * @brief get directory size
  * @param (path) file path
  * @return size of directory
  */
unsigned long long SmsAppUtil::GetTotalDirectorySize(std::wstring path) {
  unsigned long long filesize = 0;
  return filesize;
}

/**
 * @fn
 * LowerString
 * @brief convert string to lower case
 * @param (str) string
 * @return lower string
 */
string SmsAppUtil::LowerString(string str) {
  transform(str.begin(), str.end(), str.begin(), ::tolower);
  return str;
}

/**
 * @fn
 * Utf8ToUtf16
 * @brief convert utf8 to utf16
 * @param (utf8) string
 * @return wide string
 */
wstring SmsAppUtil::Utf8ToUtf16(const string &utf8) {
  auto const dest_size = ::MultiByteToWideChar(CP_UTF8, 0U, utf8.data(), -1, nullptr, 0U);
  std::vector<wchar_t> dest(dest_size, L'\0');
  if (::MultiByteToWideChar(CP_UTF8, 0U, utf8.data(), -1, dest.data(), dest.size()) == 0) {
    throw std::system_error{ static_cast<int>(::GetLastError()), std::system_category() };
  }
  dest.resize(std::char_traits<wchar_t>::length(dest.data()));
  dest.shrink_to_fit();
  return std::wstring(dest.begin(), dest.end());
}

/**
 * @fn
 * UTF16ToUTF8
 * @brief convert utf16(wstring) to utf8(string)
 * @param (str) wstring
 * @return converted utf8
 */
string SmsAppUtil::Utf16ToUtf8(const wstring& str) {
  auto const dest_size = ::WideCharToMultiByte(CP_UTF8, 0U, str.data(), -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> dest(dest_size, '\0');
  if (::WideCharToMultiByte(CP_UTF8, 0U, str.data(), -1, dest.data(), dest.size(), nullptr, nullptr) == 0) {
    throw std::system_error{ static_cast<int>(::GetLastError()), std::system_category() };
  }
  dest.resize(std::char_traits<char>::length(dest.data()));
  dest.shrink_to_fit();
  return std::string(dest.begin(), dest.end());
}

/**
 * @fn
 * UTF8ToShiftJis
 * @param(str) string
 * @brief convert shift-jis string
 * @return string
 */
string SmsAppUtil::UTF8ToShiftJis(const std::string &str) {
  int lenghtUnicode = MultiByteToWideChar(CP_UTF8, 0, str.c_str(),
                                          str.size() + 1, NULL, 0);
  wchar_t* bufUnicode = new wchar_t[lenghtUnicode];
  MultiByteToWideChar(CP_UTF8, 0, str.c_str(), str.size() + 1,
                      bufUnicode, lenghtUnicode);

  int lengthSJis = WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, -1,
                                        NULL, 0, NULL, NULL);
  char* bufShiftJis = new char[lengthSJis];
  WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, lenghtUnicode + 1,
                      bufShiftJis, lengthSJis, NULL, NULL);
  std::string strSJis(bufShiftJis);

  delete[] bufUnicode;
  delete[] bufShiftJis;
  return strSJis;
}

/**
 * @fn
 * ShiftJisToUTF16
 * @param(str) str
 * @brief convert utf16 string
 * @return wide string
 */
wstring SmsAppUtil::ShiftJisToUTF16(const string &str) {
  static_assert(sizeof(wchar_t) == 2, "this function is windows only");
  const int len = ::MultiByteToWideChar(CP_ACP, 0, str.c_str(),
                                        -1, nullptr, 0);
  wstring re(len * 2 + 2, L'\0');
  if (!::MultiByteToWideChar(CP_ACP, 0, str.c_str(), -1, &re[0], len)) {
    const auto ec = ::GetLastError();
    switch (ec) {
      case ERROR_INSUFFICIENT_BUFFER:
        throw runtime_error(
            "in function utf_16_to_shift_jis, WideCharToMultiByte fail. "
            "cause: ERROR_INSUFFICIENT_BUFFER");
        break;
      case ERROR_INVALID_FLAGS:
        throw runtime_error(
            "in function utf_16_to_shift_jis, WideCharToMultiByte fail. "
            "cause: ERROR_INVALID_FLAGS");
        break;
      case ERROR_INVALID_PARAMETER:
        throw runtime_error(
            "in function utf_16_to_shift_jis, WideCharToMultiByte fail. "
            "cause: ERROR_INVALID_PARAMETER");
        break;
      case ERROR_NO_UNICODE_TRANSLATION:
        throw runtime_error(
            "in function utf_16_to_shift_jis, WideCharToMultiByte fail. "
            "cause: ERROR_NO_UNICODE_TRANSLATION");
        break;
      default:
        throw runtime_error(
            "in function utf_16_to_shift_jis, WideCharToMultiByte fail. "
            "cause: unknown(" +
            to_string(ec) + ')');
        break;
    }
  }
  const size_t real_len = wcslen(re.c_str());
  re.resize(real_len);
  re.shrink_to_fit();
  return re;
}

/**
 * @fn
 * IsUnicode
 * @param(path) path
 * @brief determine whether is unicode file
 * @return true - unicode : false - other
 */
bool SmsAppUtil::IsUnicode(wstring &path) {
  // read all data to buffer
  ifstream ifs(path, ios::binary | ios::ate);
  ifstream::pos_type pos = ifs.tellg();
  int length = static_cast<int>(pos);
  char *buffer = new char[length];
  ifs.seekg(0, ios::beg);
  ifs.read(buffer, length);
  ifs.close();

  INT iRet = IS_TEXT_UNICODE_UNICODE_MASK;
  bool ret = (bool)IsTextUnicode(static_cast<LPCVOID>(buffer), length, &iRet);
  delete[] buffer;

  return ret;
}

/**
 * @fn
 * HexString
 * @param(data) byte array
 * @param(len) byte length
 * @brief convert hex string
 * @return hex string
 */
string SmsAppUtil::HexString(unsigned char *data, int len) {
   std::stringstream ss;
   ss << hex;
   for (int i = 0; i < len; ++i) {
     ss << setw(2) << setfill('0') << (int)data[i];
   }
   return ss.str();
}

/**
 * @fn
 * HexToBytes
 * @param(hex) hex string
 * @brief convert byte array(vector)
 * @return vector
 */
vector<char> SmsAppUtil::HexToBytes(const string &hex) {
  vector<char> bytes;
  for (unsigned int i = 0; i < hex.length(); i += 2) {
    string byteString = hex.substr(i, 2);
    char byte = (char)strtol(byteString.c_str(), NULL, 16);
    bytes.push_back(byte);
  }
  return bytes;
}

/**
 * @fn
 * ConvertColorCode
 * @brief get color code
 * @param (color) color integer value
 * @return color code string
 */
string SmsAppUtil::ConvertColorCode(int color) {
   std::stringstream stream;
   stream << std::setw(4) << std::setfill('0') << std::hex << color;
   string color_code = "#" + stream.str();
   return color_code;
}

/**
 * @fn
 * ConvertColorValue
 * @brief get color value
 * @param (color_code) color code
 * @return color code value
 */
int SmsAppUtil::ConvertColorValue(std::string color_code) {
  int color = 0;
    if (!color_code.empty()) {
      std::stringstream ss;
      ss << std::hex << color_code.substr(1);
      ss >> color;
    }
  return color;
}

/**
 * @fn
 * CreateGuid
 * @brief create guid
 * @return guid string
 */
string SmsAppUtil::CreateGuid() {
  // GUID guid;

  // if (::CoCreateGuid(&guid) != S_OK) {
  //   throw SmsException("Failed to create guid.");
  // }

  // // convert string
  // WCHAR wc[40];
  // ZeroMemory(wc, sizeof(WCHAR) * 40);
  // SmsDebugLog(std::to_string(::StringFromGUID2(guid, wc, 40)));

  // wstring ws(wc);
  // string guid_str(ws.begin(), ws.end());

  // return regex_replace(guid_str, std::regex("\\{|\\}|\\-"), "");
  return "";
}

/**
 * @fn
 * FreeHashResources
 * @brief free hash resources
 * @param (h_prov) handler 
 * @param (h_hash) hash
 */
inline void FreeHashResources(HCRYPTPROV h_prov, HCRYPTHASH h_hash) {
  if (h_hash) {
    CryptDestroyHash(h_hash);
  }

  if (h_prov) {
    CryptReleaseContext(h_prov, 0);
  }
}

/**
 * @fn
 * GetFileHash
 * @brief get file hash
 * @param (data) raw data
 * @param (len) raw data length
 * @return hex string
 */
string SmsAppUtil::GetFileHash(char *data, int len) {
  if (data == nullptr || len == 0) {
    return "";
  }

  HCRYPTPROV h_prov = NULL;
  HCRYPTHASH h_hash = NULL;
  DWORD hash_len = HASH_LENGTH;  //SHA-256->256bit=32byte
  BYTE byte_hash[HASH_LENGTH];

  // create handler
  if (!CryptAcquireContext(
        &h_prov,                  // csp handle
        NULL,                     // key container
        NULL,                     // csp name
        PROV_RSA_AES,             // provider type
        CRYPT_VERIFYCONTEXT))     // get handle option
  {
    FreeHashResources(h_prov, h_hash);
    string msg = "Error in AcquireContext " + to_string(GetLastError());
    throw SmsException(msg);
  }

  // create hash
  if (!CryptCreateHash(
        h_prov,                   // CSP handle
        CALG_SHA_256,             // SHA256
        0,                        // hash key
        0,                        // reserve
        &h_hash))                 // hash object address
  {
    FreeHashResources(h_prov, h_hash);
    string msg = "Error in CryptCreateHash " + to_string(GetLastError());
    throw SmsException(msg);
  }

  // append target data
  if (!CryptHashData(
        h_hash,                         // csp handle
        reinterpret_cast<BYTE *>(data), // target raw
        len,                            // data size
        0))                             // flag
  {
    FreeHashResources(h_prov, h_hash);
    string msg = "Error in CryptHashData " + to_string(GetLastError());
    throw SmsException(msg);
  }

  // get hash
  if (!CryptGetHashParam(
        h_hash, 
        HP_HASHVAL, // get hash
        byte_hash,  // out hash
        &hash_len,  // out length
        0))
  {
    FreeHashResources(h_prov, h_hash);
    string msg = "Error in CryptGetHashParam " + to_string(GetLastError());
    throw SmsException(msg);
  }
  FreeHashResources(h_prov, h_hash);

  return HexString(reinterpret_cast<unsigned char*>(byte_hash), hash_len);
}

/**
* @fn
* IsSupportImageFormat
* @brief determine whether image format is supported
* @param(file_name) thumbnail path
* @return support - true
*/
bool SmsAppUtil::IsSupportImageFormat(std::wstring file_name) {

  // fs::wpath f(file_name);
  // auto ext = f.extension().string();

  // boost::algorithm::to_lower(ext);
  // vector<string> support_formats = {".bmp",   ".gif",   ".jpg", 
  //                                   ".jpeg",  ".png",   ".tpi", 
  //                                   // XXX:TIF supports only reference diagram if necessary
  //                                   //".tif",   ".tiff"
  // };

  // auto ext_found = find(support_formats.begin(), support_formats.end(), ext);

  // return (ext_found != support_formats.end());
  return true;
}

/**
 * @fn
 * GenerateUniqueFileNameInFolder
 * @brief generate unique file name in folder
 * @param(file_name) source file name
 * @param(folder) parent folder
 * @return generated file name
 */
wstring SmsAppUtil::GenerateUniqueFileNameInFolder(const wstring &file_name,
                                                    const wstring &folder) {
  // fs::wpath file_src_path(file_name);
  // fs::wpath folder_path(folder);
  // auto result = file_src_path.filename().wstring();
  // auto extension_file = file_src_path.extension().wstring();
  // boost::wregex expr{L"\\d+$"};
  // wstring sub_name;
  // while (true) {
  //   if (!fs::exists(folder_path / result)) return result;
  //   auto stem_file = fs::wpath(result).filename().stem().wstring();
  //   boost::wsmatch match;
  //   if (boost::regex_search(stem_file, match, expr)){
  //     auto str = match[0].str();
  //     if (sub_name.empty()) sub_name = stem_file.substr(0, stem_file.length() - str.length());
  //     auto index = stoi(str);
  //     auto sub_number = std::to_wstring(++index);
  //     stem_file = sub_name + sub_number;
  //     result = stem_file.append(extension_file);
  //     continue;
  //   }
  //   stem_file += L"0";
  //   result = stem_file.append(extension_file);
  // }

  return L"";
}

/**
 * @fn
 * GetDiskFreeSpaceSize
 * @brief get disk free space (MB)
 * @param(path) path
 * @return free space (MB)
 */
unsigned long long SmsAppUtil::GetDiskFreeSpaceSize(std::wstring &path) {
  ULARGE_INTEGER freeBytesAvailable, totalNumberOfBytes, totalNumberOfFreeBytes;		
  if (GetDiskFreeSpaceEx(
    path.c_str(),
    &freeBytesAvailable,
    &totalNumberOfBytes,
    &totalNumberOfFreeBytes) != 0) {
    //std::wcout << L"total : " << totalNumberOfBytes.QuadPart / 1048576 << L"MB" << std::endl;
    //std::wcout << L"free : " << totalNumberOfFreeBytes.QuadPart / 1048576 << L"MB" << std::endl;
    if (totalNumberOfFreeBytes.QuadPart) {
      return totalNumberOfFreeBytes.QuadPart / 1048576ULL; // MB
    }
  }
  return 0;
}

/**
 * @fn
 * GetDriveTypeString
 * @brief get drive type
 * @param(folder_path) path
 * @return drive type unknown, removable, fixed, remote, cdrom, ramdisk
 */
string SmsAppUtil::GetDriveTypeString(wstring &folder_path) {
  // fs::path d(folder_path);
  wstring root = L""; //fs::absolute(d).root_path().wstring();
  UINT type;// = GetDriveTypeW(root.c_str());
  //SmsTraceLog(L"driveType=" + to_wstring(type) + L" drive=" + L"root");
  string d_type = "unknown";
  switch (type) {
    case DRIVE_REMOVABLE:
      d_type = "removable";
      break;
    case DRIVE_FIXED:
      d_type = "fixed";
      break;
    case DRIVE_REMOTE:
      d_type = "remote";
      break;
    case DRIVE_CDROM:
      d_type = "cdrom";
      break;
    case DRIVE_RAMDISK:
      d_type = "ramdisk";
      break;
    default:
      if (root.find(L"\\\\") == 0) {
        d_type = "remote";
      }
      break;
  }
  return d_type;
}

/**
 * @fn
 * WriteUnicodeFile
 * @brief write unicode file
 * @param (path) file path
 * @param (mode) write mode
 * @param (str) string
 */
void SmsAppUtil::WriteUnicodeFile(wstring &path, const wstring &mode, wstringstream &ss) {
   FILE *fp = nullptr;
   errno_t err;
   if ((err = _wfopen_s(&fp, path.c_str(), mode.c_str())) != 0) {
     throw SmsException(L"failed to open file. [" + path + L"] err=" + to_wstring(err));
   }

   int size = fwprintf_s(fp, L"%s", ss.str().c_str());
   fclose(fp);
   if (size < 0) {
     throw SmsException(L"failed to write file. [" + path + L"]");
   }
}

}  // namespace accessor
