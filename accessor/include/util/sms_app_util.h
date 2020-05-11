/**
 * @file sms_app_util.h
 * @brief application utility header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef ACCESSOR_INCLUDE_UTIL_SMS_APP_UTIL_H_
#define ACCESSOR_INCLUDE_UTIL_SMS_APP_UTIL_H_

#include <string>
#include <vector>

namespace accessor {

const std::wstring W_MODE_WRITE_UTF16LE = L"w,ccs=UTF-16LE";
const std::wstring W_MODE_READ_UTF16LE = L"r,ccs=UTF-16LE";
const std::wstring W_MODE_WRITE_UTF8 = L"w,ccs=UTF-8";
const std::wstring W_MODE_READ_UTF8 = L"r,ccs=UTF-8";


/**
 * @class SmsAppUtil
 * @brief application utility
 */
class SmsAppUtil {
 public:
  /**
   * @fn
   * ~SmsAppUtil
   * @brief destructor
   */
  ~SmsAppUtil();

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
   * ExistsDirectory
   * @brief exists Directory
   * @param (path) directory path
   * @return true - exists , false - not exists
   */
  static bool ExistsDirectory(std::wstring &path);

  /**
   * @fn
   * GetTotalFileSize
   * @brief get file size
   * @param (path) file path
   * @param (number_of_files) number of files
   * @return size of files or directory
   */
  static unsigned long long GetTotalFileSize(std::wstring path,
                                    int *number_of_files = nullptr);

  /**
   * @fn
   * GetTotalDirectorySize
   * @brief get directory size
   * @param (path) file path
   * @return size of directory
   */
  static unsigned long long GetTotalDirectorySize(std::wstring path);

  // /**
  //  * @fn
  //  * ShiftJisToUTF8
  //  * @brief convert sjis to utf8
  //  * @param (sjis) string
  //  * @return string
  //  */
  // static std::string SmsAppUtil::ShiftJisToUTF8(const std::string &sjis);

  /**
   * @fn
   * Utf8ToUtf16
   * @brief convert utf8 to utf16
   * @param (utf8) string
   * @return wide string
   */
  static std::wstring Utf8ToUtf16(const std::string &utf8);

  /**
  * @fn
  * UTF16ToUTF8
  * @brief convert utf16(wstring) to utf8(string)
  * @param (str) wstring
  * @return converted utf8
  */
  static std::string Utf16ToUtf8(const std::wstring &str);

  /**
   * @fn
   * ShiftJisToUTF16
   * @param(str) string
   * @brief convert utf16 string
   * @return wide string
   */
  static std::wstring ShiftJisToUTF16(const std::string &str);

  /**
   * @fn
   * Utf16ToShiftJis
   * @brief convert wstring to ShiftJis
   * @param (str) wstring
   * @return converted ShiftJis
   */
  static std::string Utf16ToShiftJis(const std::wstring &str);

  /**
   * @fn
   * UTF8ToShiftJis
   * @param(str) string
   * @brief convert shift-jis string
   * @return string
   */
  static std::string UTF8ToShiftJis(const std::string &str);

  /**
   * @fn
   * IsUnicode
   * @param(path) path
   * @brief determine whether is unicode file
   * @return true - unicode : false - other
   */
  static bool IsUnicode(std::wstring &path);

  /**
   * @fn
   * HexString
   * @param(data) byte array
   * @param(len) byte length
   * @brief convert hex string
   * @return hex string
   */
  static std::string HexString(unsigned char *data, int len);

  /**
   * @fn
   * HexToBytes
   * @param(hex) hex string
   * @brief convert byte array(vector)
   * @return vector
   */
  static std::vector<char> HexToBytes(const std::string &hex);

  /**
   * @fn
   * GetFilesInDirectory
   * @brief get file size
   * @param (full_path) dir path
   * @param (ext_filter) extension filter
   * @return files in directory
   */
  //static std::vector<fs::path> GetFilesInDirectory(fs::path full_path, fs::path *ext_filter = nullptr);

  /**
   * @fn
   * ConvertColorCode
   * @brief get color code
   * @param (color) color integer value
   * @return color code string
   */
  static std::string SmsAppUtil::ConvertColorCode(int color);

  /**
   * @fn
   * ConvertColorValue
   * @brief get color value
   * @param (color_code) color code
   * @return color code value
   */
  static int ConvertColorValue(std::string color_code);

  /**
   * @fn
   * CreateGuid
   * @brief create guid
   * @return guid string
   */
  static std::string CreateGuid();

  /**
   * @fn
   * Base64_encode
   * @brief encode to base64
   * @param(s) source string
   * @return base64 string
   */
  static std::string Base64_encode(const std::string& s);

  /**
   * @fn
   * Base64_encode
   * @brief decode to base64
   * @param (b) base64 string
   * @return string
   */
  static std::string Base64_decode(const std::string& b);

  /**
   * @fn
   * GetFileHash
   * @brief get file hash
   * @param (data) raw data
   * @param (len) raw data length
   * @return hex string
   */
  static std::string GetFileHash(char *data, int len);

  /**
  * @fn
  * IsSupportImageFormat
  * @brief determine whether image format is supported
  * @param(file_name) thumbnail path
  * @return support - true
  */
  static bool IsSupportImageFormat(std::wstring file_name);

  /**
  * @fn
  * GenerateUniqueFileNameInFolder
  * @brief generate unique file name in folder
  * @param(file_name) source file name
  * @param(folder) parent folder
  * @return generated file name
  */
  static std::wstring GenerateUniqueFileNameInFolder(const std::wstring &file_name, const std::wstring &folder);

  /**
   * @fn
   * GetDiskFreeSpaceSize
   * @brief get disk free space (MB)
   * @param(path) path
   * @return free space (MB)
   */
  static unsigned long long GetDiskFreeSpaceSize(std::wstring &path);

  /**
   * @fn
   * GetDriveTypeString
   * @brief get drive type
   * @param(folder_path) path
   * @return drive type unknown, removable, fixed, remote, cdrom, ramdisk
   */
  static std::string GetDriveTypeString(std::wstring &folder_path);

  /**
   * @fn
   * WriteUnicodeFile
   * @brief write unicode file
   * @param (path) file path
   * @param (mode) mode
   * @param (ss) string stream
   */
  static void WriteUnicodeFile(std::wstring &path, const std::wstring &mode, std::wstringstream &ss);
  
  /**
   * @fn
   * ReadUnicodeFile
   * @brief read unicode file
   * @param (path) file path
   * @return string stream
   */
  static std::wstringstream ReadUnicodeFile(std::wstring &path, const std::wstring &mode);

private:
  /**
   * @fn
   * SmsAppUtil
   * @brief constructor
   */
  SmsAppUtil();

  /**
   * @fn
   * LowerString
   * @brief convert string to lower case
   * @param (str) string
   * @return lower string
   */
  static std::string LowerString(std::string str);
};

}  // namespace accessor

#endif  // ACCESSOR_INCLUDE_UTIL_SMS_APP_UTIL_H_
