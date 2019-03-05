/**
 * @file goyo_app_util.cc
 * @brief application utility implementation
 * @author yonaha
 * @date 2018/03/01
 */

#include "util/goyo_app_util.h"
#include <boost/beast/core/detail/base64.hpp>
#include <boost/algorithm/string.hpp>
#include <boost/property_tree/ini_parser.hpp>
#include <boost/property_tree/ptree.hpp>
#include <boost/regex.hpp>
#include <fstream>
#include <iomanip>
#include <locale>
#include <regex>
#include "common.h"
#include "except/goyo_exception.h"
#include "accessor_command.h"

using namespace std;
using namespace boost::property_tree::ini_parser;

namespace goyo_bookrack_accessor {

const int HASH_LENGTH = 32;

/**
 * @fn
 * GoyoAppUtil
 * @brief constructor
 */
GoyoAppUtil::GoyoAppUtil() {}

/**
 * @fn
 * ~GoyoAppUtil
 * @brief destructor
 */
GoyoAppUtil::~GoyoAppUtil() {}

/**
 * @fn
 * ExistsFile
 * @brief exists file
 * @param (path) file path
 * @return true - exists , false - otherwise error
 */
bool GoyoAppUtil::ExistsFile(wstring &path) {
  // boost::system::error_code error;
  // const fs::path file(path);
  // return fs::exists(file, error);
  return _waccess(path.c_str(), 6) == 0;
}

/**
 * @fn
 * ExistsDirectory
 * @brief exists Directory
 * @param (path) directory path
 * @return true - exists , false - not exists
 */
bool GoyoAppUtil::ExistsDirectory(wstring &path) {
  return fs::is_directory(path);
}

/**
 * @fn
 * GetTotalFileSize
 * @brief get file size
 * @param (path) file path
 * @param (number_of_files) number of files
 * @return size of files or directory
 */
unsigned long long GoyoAppUtil::GetTotalFileSize(wstring path,
                                        int *number_of_files) {
  unsigned long long filesize = 0;
  int i_number_of_files = 0;
  vector<fs::path> files;
  if (!GoyoAppUtil::ExistsFile(path)) {
    throw GoyoException(L"File not found: " + path);
  }
  try {
    if (path.find(L"*") != wstring::npos) {
      fs::path files_path(path);
      fs::path dir_name = files_path.parent_path();
      fs::path files_name = files_path.filename();
      fs::path *ext = &files_name.extension();
      files = GetFilesInDirectory(dir_name, ext);
    } else {
      const fs::path file(path);
      if (fs::is_directory(file) == true) {
        files = GetFilesInDirectory(file);
      } else {
        files.push_back(file);
      }
    }
    for (fs::path file : files) {
      filesize += fs::file_size(file);
      i_number_of_files++;
    }
  } catch (fs::filesystem_error &ex) {
    throw GoyoException(ex.what());
  }
  number_of_files = &i_number_of_files;
  return filesize;
}

 /**
  * @fn
  * GetTotalDirectorySize
  * @brief get directory size
  * @param (path) file path
  * @return size of directory
  */
unsigned long long GoyoAppUtil::GetTotalDirectorySize(std::wstring path) {
  unsigned long long filesize = 0;
  if (!GoyoAppUtil::ExistsDirectory(path)) {
    throw GoyoException(L"Directory not found: " + path);
  }
  for( fs::directory_iterator file( path );
       file != fs::directory_iterator(); 
       ++file ) {
    try {     
      fs::path current( file->path() );
      if( fs::is_directory( current ) ) {
        filesize += GetTotalDirectorySize(current.wstring());
      } else {
        filesize += fs::file_size(current);
      }
    } catch (fs::filesystem_error &ex) {
      throw GoyoException(ex.what());
    }
  }
  return filesize;
}

/**
 * @fn
 * GetFilesInDirectory
 * @brief get file size
 * @param (full_path) dir path
 * @param (ext_filter) extension filter
 * @return files in directory
 */
vector<fs::path> GoyoAppUtil::GetFilesInDirectory(fs::path full_path,
                                                        fs::path *ext_filter) {
  vector<fs::path> files;
  try {
    if (fs::is_directory(full_path)) {
      fs::directory_iterator end_iter;
      for (fs::directory_iterator dir_itr(full_path); dir_itr != end_iter;
           ++dir_itr) {
        if (fs::is_regular_file(dir_itr->status())) {
          fs::path file = dir_itr->path();
          if ((ext_filter == nullptr ||
               LowerString(file.extension().string()) ==
                   LowerString(ext_filter->string()))) {
            files.push_back(file);
          }
        }
      }
    }
  } catch (exception &ex) {
    throw GoyoException(ex.what());
  }
  return files;
}

/**
 * @fn
 * LowerString
 * @brief convert string to lower case
 * @param (str) string
 * @return lower string
 */
string GoyoAppUtil::LowerString(string str) {
  transform(str.begin(), str.end(), str.begin(), ::tolower);
  return str;
}

// /**
//  * @fn
//  * ShiftJisToUTF8
//  * @brief convert sjis to utf8
//  * @param (sjis) string
//  * @return string
//  */
// string GoyoAppUtil::ShiftJisToUTF8(const string &sjis) {
//   wstring utf16 = ShiftJisToUTF16(sjis);
//   return Utf16ToUtf8(utf16);
// }

/**
 * @fn
 * Utf8ToUtf16
 * @brief convert utf8 to utf16
 * @param (utf8) string
 * @return wide string
 */
wstring GoyoAppUtil::Utf8ToUtf16(const string &utf8) {
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
string GoyoAppUtil::Utf16ToUtf8(const wstring& str) {
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
string GoyoAppUtil::UTF8ToShiftJis(const std::string &str) {
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
wstring GoyoAppUtil::ShiftJisToUTF16(const string &str) {
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

// /**
//  * @fn
//  * Utf16ToShiftJis
//  * @brief convert wstring to ShiftJis
//  * @param (str) wstring
//  * @return converted ShiftJis
//  */
// string GoyoAppUtil::Utf16ToShiftJis(const wstring& str) {
//      wstring_convert<codecvt_utf8<wchar_t>, wchar_t> cv;
//      std::string mbs = cv.to_bytes(str);

//     int lenghtUnicode =
//         MultiByteToWideChar(CP_UTF8, 0, mbs.c_str(),
//                             mbs.size() + 1, nullptr, 0);
//     wchar_t* bufUnicode = new wchar_t[lenghtUnicode];
//     MultiByteToWideChar(CP_UTF8, 0, mbs.c_str(), mbs.size() + 1, bufUnicode,
//         lenghtUnicode);

//     int lengthSJis = WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, -1,
//         nullptr, 0, nullptr, nullptr);
//     char* bufShiftJis = new char[lengthSJis];
//     WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, lenghtUnicode + 1,
//         bufShiftJis, lengthSJis, nullptr, nullptr);

//     std::string strSJis(bufShiftJis);

//     delete[] bufUnicode;
//     delete[] bufShiftJis;
//     return strSJis;
// }

/**
 * @fn
 * IsUnicode
 * @param(path) path
 * @brief determine whether is unicode file
 * @return true - unicode : false - other
 */
bool GoyoAppUtil::IsUnicode(wstring &path) {
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
string GoyoAppUtil::HexString(unsigned char *data, int len) {
  stringstream ss;
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
vector<char> GoyoAppUtil::HexToBytes(const string &hex) {
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
string GoyoAppUtil::ConvertColorCode(int color) {
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
int GoyoAppUtil::ConvertColorValue(std::string color_code) {
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
string GoyoAppUtil::CreateGuid() {
  GUID guid;

  if (::CoCreateGuid(&guid) != S_OK) {
    throw GoyoException("Failed to create guid.");
  }

  // convert string
  WCHAR wc[40];
  ZeroMemory(wc, sizeof(WCHAR) * 40);
  GoyoDebugLog(std::to_string(::StringFromGUID2(guid, wc, 40)));

  wstring ws(wc);
  string guid_str(ws.begin(), ws.end());

  return regex_replace(guid_str, std::regex("\\{|\\}|\\-"), "");
}

/**
 * @fn
 * Base64_encode
 * @brief encode to base64
 * @param(s) source string
 * @return base64 string
 */
string GoyoAppUtil::Base64_encode(const string& s) {
  return boost::beast::detail::base64_encode(s);
}

/**
 * @fn
 * Base64_encode
 * @brief decode to base64
 * @param (b) base64 string
 * @return string
 */
string GoyoAppUtil::Base64_decode(const string& b) {
  return boost::beast::detail::base64_decode(b);
}

/**
 * @fn
 * FreeHashResources
 * @brief free hash resources
 * @param (h_prov) handler 
 * @param (h_hash) hash
 */
inline void FreeHashResources(HCRYPTPROV h_prov, 
  HCRYPTHASH h_hash)
{
  if (h_hash)
  {
    CryptDestroyHash(h_hash);
  }

  if (h_prov)
  {
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
string GoyoAppUtil::GetFileHash(char *data, int len)
{
  if (data == nullptr || len == 0)
  {
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
    throw GoyoException(msg);
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
    throw GoyoException(msg);
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
    throw GoyoException(msg);
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
    throw GoyoException(msg);
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
bool GoyoAppUtil::IsSupportImageFormat(std::wstring file_name) {

  fs::wpath f(file_name);
  auto ext = f.extension().string();

  boost::algorithm::to_lower(ext);
  vector<string> support_formats = {".bmp",   ".gif",   ".jpg", 
                                    ".jpeg",  ".png",   ".tpi", 
                                    // XXX:TIF supports only reference diagram if necessary
                                    //".tif",   ".tiff"
  };

  auto ext_found = find(support_formats.begin(), support_formats.end(), ext);

  return (ext_found != support_formats.end());
}

/**
 * @fn
 * GenerateUniqueFileNameInFolder
 * @brief generate unique file name in folder
 * @param(file_name) source file name
 * @param(folder) parent folder
 * @return generated file name
 */
wstring GoyoAppUtil::GenerateUniqueFileNameInFolder(const wstring &file_name,
                                                    const wstring &folder) {
  fs::wpath file_src_path(file_name);
  fs::wpath folder_path(folder);
  auto result = file_src_path.filename().wstring();
  auto extension_file = file_src_path.extension().wstring();
  boost::wregex expr{L"\\d+$"};
  wstring sub_name;
  while (true) {
    if (!fs::exists(folder_path / result)) return result;
    auto stem_file = fs::wpath(result).filename().stem().wstring();
    boost::wsmatch match;
    if (boost::regex_search(stem_file, match, expr)){
      auto str = match[0].str();
      if (sub_name.empty()) sub_name = stem_file.substr(0, stem_file.length() - str.length());
      auto index = stoi(str);
      auto sub_number = std::to_wstring(++index);
      stem_file = sub_name + sub_number;
      result = stem_file.append(extension_file);
      continue;
    }
    stem_file += L"0";
    result = stem_file.append(extension_file);
  }
}

/**
 * @fn
 * GetDiskFreeSpaceSize
 * @brief get disk free space (MB)
 * @param(path) path
 * @return free space (MB)
 */
unsigned long long GoyoAppUtil::GetDiskFreeSpaceSize(std::wstring &path) {
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
string GoyoAppUtil::GetDriveTypeString(wstring &folder_path) {
  fs::path d(folder_path);
  wstring root = fs::absolute(d).root_path().wstring();
  UINT type = GetDriveTypeW(root.c_str());
  GoyoTraceLog(L"driveType=" + to_wstring(type) + L" drive=" + root);
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
void GoyoAppUtil::WriteUnicodeFile(wstring &path, const wstring &mode, wstringstream &ss) {
  FILE *fp = nullptr;
  errno_t err;
  if ((err = _wfopen_s(&fp, path.c_str(), mode.c_str())) != 0) {
    throw GoyoException(L"failed to open file. [" + path + L"] err=" + to_wstring(err));
  }
  
  int size = fwprintf_s(fp, L"%s", ss.str().c_str());
  fclose(fp);
  if (size < 0) {
    throw GoyoException(L"failed to write file. [" + path + L"]");
  }
}

/**
 * @fn
 * ReadUnicodeFile
 * @brief read unicode file
 * @param (path) file path
 * @param (mode)
 */
wstringstream GoyoAppUtil::ReadUnicodeFile(wstring &path, const wstring &mode) {
  FILE *fp = nullptr;
  errno_t err;
  if ((err = _wfopen_s(&fp, path.c_str(), mode.c_str())) != 0) {
    throw GoyoException(L"failed to open file. [" + path + L"] err=" + to_wstring(err));
  }
  
  const int BUF_LEN = 1024;
  wstringstream ss;
  wchar_t buf[BUF_LEN];
  ss.str(L"");
  // max 40MB (1024*1024*10 10MB * n byte character)
  for (int i = 0; i < 10455040 && (fgetws(buf, BUF_LEN, fp)) != nullptr;) {
    ss << buf;
    buf[0] = '\0';
    i += BUF_LEN;
  }
  fclose(fp);

  return ss;
}

/**
 * @fn
 * ReadUnicodeIni
 * @brief read unicode ini file
 * @param (path) file path
 * @return property tree
 */
boost::property_tree::wptree GoyoAppUtil::ReadUnicodeIni(wstring &path) {
      // old-goyo18 logic
  // if (GoyoAppUtil::IsUnicode(path) == false) {
  //   auto str = ConvertShiftJisToUnicodeFromFile(path);
  //   wstringstream ss(str);
  //   GoyoAppUtil::WriteUnicodeFile(path, W_MODE_WRITE_UTF16LE, ss);
  // }

  auto ss = ReadUnicodeFile(path, W_MODE_READ_UTF16LE);

  boost::property_tree::wptree pt;
  try {
    read_ini(ss, pt);
  } catch (ini_parser_error &ex) {
    throw GoyoException(ex.what());
  }

  return pt;
}

/**
 * @fn
 * WriteUnicodeIni
 * @brief write unicode ini file
 * @param (path) file path
 * @return 1 if success, 0 if not success
 */
int GoyoAppUtil::WriteUnicodeIni(wstring &path, boost::property_tree::wptree &pt) {
  try {
    wstringstream ss;
    write_ini(ss, pt, 0);
    WriteUnicodeFile(path, W_MODE_WRITE_UTF16LE, ss);
  } catch (ini_parser_error &ex) {
    throw GoyoException(ex.what());
  }
  return 1;
}

///**
//* @fn
//* ConvertImageFile
//* @brief convert image file. convert only the formats that need to be converted.
//* @param(src_file) source file name
//* @return generated file path, if not converted then return empty string
//*/
//wstring GoyoAppUtil::ConvertImageFile(const wstring &src_file) {
//
//  fs::wpath file_src_path(src_file);
//  auto ext = file_src_path.extension().string();
//  boost::algorithm::to_lower(ext);
//
//  GoyoDebugLog(L"convert from:" + src_file);
//  if (ext != ".tif" && ext != ".tiff") {
//    GoyoDebugLog("not converted");
//    return L"";
//  }
//  
//  // get temp directory
//  wstring temp_path;
//  wchar_t w_path[MAX_PATH];
//  if (!GetTempPathW(MAX_PATH, w_path)) {
//    return L"";
//  }
//  temp_path = w_path;
//
//  wstring dest = temp_path + L"\\" + file_src_path.filename().stem().wstring() + L".jpg";
//
//  GoyoDebugLog(L"convert   to:" + dest);
//  string s = Utf16ToShiftJis(src_file);
//  string d = Utf16ToShiftJis(dest);
//  
//  // convert jpeg
//  GoyoImage image(s);
//  image.ConvertJpg(d);
//
//  return dest;
//}

}  // namespace goyo_bookrack_accessor
