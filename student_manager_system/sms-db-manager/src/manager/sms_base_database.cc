/**
 * @file sms_base_database.cc
 * @brief sms base database object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/manager/sms_base_database.h"
#include <windows.h>
#include <memory>
#include <vector>
#include <boost/filesystem.hpp>
#include "sms_db/SmsDatabase.h"

using namespace std;
using namespace db_manager;

namespace db_manager {
namespace manager {


/**
 * @fn
 * SmsBaseDatabase
 * @brief default constructor
 */
SmsBaseDatabase::SmsBaseDatabase() {}

/**
 * @fn
 * SmsBaseDatabase
 * @brief copy constructor
 * @param obj source object
 */
SmsBaseDatabase::SmsBaseDatabase(SmsBaseDatabase &obj) {
  this->internal_db_ = obj.internal_db_;
  this->db_path_ = obj.db_path_;
}

/**
 * @fn
 * SmsBaseDatabase
 * @brief copy constructor
 * @param db source object
 */
SmsBaseDatabase::SmsBaseDatabase(SmsDatabase &db) {
  this->internal_db_ = db;
  this->db_path_ = db.GetFileName();
}

/**
 * @fn
 * ~SmsBaseDatabase
 * @brief destructor
 */
SmsBaseDatabase::~SmsBaseDatabase() = default;

/**
 * @fn
 * GetInternalDB
 * @brief get internal db
 * @return internal db instance
 */
db_manager::SmsDatabase SmsBaseDatabase::GetInternalDB() {
  return SmsDatabase(db_path_, READ_WRITE, true);
}

/**
 * @fn
 * GetCurrentVersion
 * @brief get current version
 * @return version history
 */
// GoyoVersionHistory SmsBaseDatabase::GetCurrentVersion() {
//   try {
//     GoyoStatement goyo_statement(this->GetInternalDB(),
//                                  u8"SELECT versionId, changeHistory FROM "
//                                  u8"versionHistory ORDER BY versionId DESC "
//                                  u8"LIMIT 1;");

//     if (goyo_statement.ExecuteStep()) {
//       const auto version = goyo_statement.GetColumn(0).GetDouble();
//       auto history = goyo_statement.GetColumn(1).GetString();
//       goyo_statement.Reset();

//       GoyoVersionHistory ver(version, history);
//       return ver;
//     }
//   } catch (std::exception &ex) {
//     throw SmsDatabaseException(ex.what());
//   }
//   GoyoVersionHistory ver(0.0, "");
//   return ver;
// }

/**
 * @fn
 * UpdateVersion
 * @brief update version
 * @param new_version new version
 */
// void SmsBaseDatabase::UpdateVersion(GoyoVersionHistory &new_version) {
//   try {
//     const auto newVerId = new_version.GetVersionId();
//     if (GetCurrentVersion().GetVersionId() < newVerId) {
//       GoyoStatement statement(
//           this->GetInternalDB(),
//           "INSERT INTO versionHistory (versionId, changeHistory) VALUES(?,?);");
//       statement.Bind(1, newVerId);
//       statement.Bind(2, new_version.GetChangeHistory());
//       statement.Execute();
//       statement.Reset();
//     }
//   } catch (std::exception &ex) {
//     throw SmsDatabaseException(ex.what());
//   }
// }

/**
 * @fn
 * UTF16ToUTF8
 * @brief convert utf16(wstring) to utf8(string)
 * @param str wstring
 * @return converted utf8
 */
string SmsBaseDatabase::Utf16ToUtf8(const wstring &str) {
  auto const dest_size = ::WideCharToMultiByte(CP_UTF8, 0U, str.data(), -1, nullptr, 0, nullptr, nullptr);
  std::vector<char> dest(dest_size, '\0');
  if (::WideCharToMultiByte(CP_UTF8, 0U, str.data(), -1, dest.data(), dest.size(), nullptr, nullptr) == 0) {
      throw std::system_error{static_cast<int>(::GetLastError()), std::system_category()};
  }
  dest.resize(std::char_traits<char>::length(dest.data()));
  dest.shrink_to_fit();
  return std::string(dest.begin(), dest.end());
}

/**
 * @fn
 * Utf8ToUtf16
 * @brief convert utf8 to utf16
 * @param utf8 string
 * @return wide string
 */
wstring SmsBaseDatabase::Utf8ToUtf16(const string &utf8) {
  auto const dest_size = ::MultiByteToWideChar(CP_UTF8, 0U, utf8.data(), -1, nullptr, 0U);
  std::vector<wchar_t> dest(dest_size, L'\0');
  if (::MultiByteToWideChar(CP_UTF8, 0U, utf8.data(), -1, dest.data(), dest.size()) == 0) {
      throw std::system_error{static_cast<int>(::GetLastError()), std::system_category()};
  }
  dest.resize(std::char_traits<wchar_t>::length(dest.data()));
  dest.shrink_to_fit();
  return std::wstring(dest.begin(), dest.end());
}

/**
 * @fn
 * BeginTransaction
 * @brief begin transaction
 */
void SmsBaseDatabase::BeginTransaction() {
  this->GetInternalDB().ExecSQL("BEGIN");
}

/**
 * @fn
 * Commit
 * @brief commit transaction
 */
void SmsBaseDatabase::Commit() {
  this->GetInternalDB().ExecSQL("COMMIT");
}

/**
 * @fn
 * Rollback
 * @brief rollback transaction
 */
void SmsBaseDatabase::Rollback() {
  try {
    this->GetInternalDB().ExecSQL("ROLLBACK");
  } catch (SmsDatabaseException) {
    // exceptions that occurred with rollback can not be recovered
  }
}

/**
 * @fn
 * UpdateDatabaseStructure
 * @brief update database structure
 */
void SmsBaseDatabase::UpdateDatabaseStructure() {}


/**
 * @fn
 * SetWalMode
 * @param enable
 * @brief set WAL mode, synchronous=NORMAL
 */
void SmsBaseDatabase::SetWalMode(bool enable) {
  try {
    auto &db = this->GetInternalDB();
    db.ExecSQL("PRAGMA busy_timeout = 30000");
    if (enable) {
      db.ExecSQL("PRAGMA journal_mode = WAL");
      // db.ExecSQL("PRAGMA locking_mode = NORMAL");
      // db.ExecSQL("PRAGMA synchronous = NORMAL");
    } else {
      // db.ExecSQL("PRAGMA journal_mode = DELETE");
      // db.ExecSQL("PRAGMA locking_mode = NORMAL");
      // db.ExecSQL("PRAGMA synchronous = NORMAL");
    }
  } catch (SmsDatabaseException) {
    // exceptions that occurred with change jornal mode, synchronous
  }
}

/**
 * @fn
 * SetCacheSize
 * @brief set cache size
 * @param cache_size
 */
void SmsBaseDatabase::SetCacheSize(int cache_size) {
  try {
    this->GetInternalDB().ExecSQL("PRAGMA cache_size=" + to_string(cache_size));
  } catch (SmsDatabaseException) {
    // exceptions that occurred with change cache size
  }
}

/**
 * @fn
 * GetFileCount
 * @brief get file count
 * @param utf16 string
 * @return int
 */
int SmsBaseDatabase::GetFileCount(std::wstring directory) {
  namespace fs = boost::filesystem;
  fs::wpath dir_path(directory);
  int count = 0;

  fs::directory_iterator end_iter; // Default constructor for an iterator is the end iterator
  for (fs::directory_iterator iter(dir_path); iter != end_iter; ++iter) {
    ++count;
  }
  return count;
}

/**
 * @fn
 * ReleaseDatabaseFromDBPool
 * @brief release database from db pool
 */
void SmsBaseDatabase::ReleaseDatabaseFromDBPool() {
  SmsDatabase::ReleaseDatabaseFromDBPool(this->GetDBPath());
}

/**
 * @fn
 * InTransactionMark
 * @brief set transaction mark
 * @param in_tran true - start transaction mark : false - end transaction mark
 */
void SmsBaseDatabase::InTransactionMark(const bool in_tran) {
  SmsDatabase::InTransactionMark(this->GetDBPath(), in_tran);
}

/**
 * @fn
 * GetDBPath
 * @brief get database path
 */
string SmsBaseDatabase::GetDBPath() const {
  return this->db_path_;
}

/**
 * @fn
 * IsAccessiblePath
 * @brief determine whether exist path, and accssible
 * @parm(path) 
 * @return true- exist : false - not exist or not access
 */
bool SmsBaseDatabase::IsAccessiblePath(std::wstring &path) {
  if (!_waccess(path.c_str(), 6)) {
    return true;
  }
  return false;
}

}  // namespace manager
}  // namespace db_manager
