/**
 * @file sms_base_database.h
 * @brief sms base database object header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef DB_MANAGER_INCLUDE_DB_MANAGER_SMS_BASE_DATABASE_H_
#define DB_MANAGER_INCLUDE_DB_MANAGER_SMS_BASE_DATABASE_H_

#include <codecvt>
#include <string>
#include "sms_db/SmsDatabase.h"

namespace db_manager {
namespace manager {

const int SMS_BASE_DATABASE_CONST = 1;
const int SMS_DB_CACHE_SIZE = 5000;

/**
 * @class SmsBaseDatabase
 * @brief goyo value object implementation
 */
class SmsBaseDatabase {
 public:
  /**
   * @fn
   * SmsBaseDatabase
   * @brief default constructor
   */
  SmsBaseDatabase();

  /**
   * @fn
   * SmsBaseDatabase
   * @brief constructor
   * @param database source database
   */
  explicit SmsBaseDatabase(db_manager::SmsDatabase &database);

  /**
   * @fn
   * SmsBaseDatabase
   * @brief copy constructor
   * @param instance source instance
   */
  SmsBaseDatabase(db_manager::manager::SmsBaseDatabase &instance);

  /**
   * @fn
   * ~SmsBaseDatabase
   * @brief destructor
   */
  virtual ~SmsBaseDatabase();

  /**
   * @fn
   * InitializeDatabase
   * @brief initialize database
   */
  virtual void InitializeDatabase() = 0;

  /**
   * @fn
   * GetCurrentVersion
   * @brief get current version
   * @return version history
   */
  // db_manager::model::GoyoVersionHistory GetCurrentVersion();

  /**
   * @fn
   * UpdateVersion
   * @brief update version
   * @param new_version new version
   */
  // void UpdateVersion(db_manager::model::GoyoVersionHistory &new_version);

  /**
   * @fn
   * BeginTransaction
   * @brief begin transaction
   */
  virtual void BeginTransaction();

  /**
   * @fn
   * Commit
   * @brief commit transaction
   */
  virtual void Commit();

  /**
   * @fn
   * Rollback
   * @brief rollback transaction
   */
  virtual void Rollback();

  /**
   * @fn
   * SetWalMode
   * @param enable
   * @brief set WAL mode, synchronous=NORMAL
   */
  void SetWalMode(bool enable);

  /**
   * @fn
   * SetCacheSize
   * @brief set cache size
   * @param cache_size
   */
  void SetCacheSize(int cache_size);

  /**
   * @fn
   * ReleaseDatabaseFromDBPool
   * @brief release database from db pool
   */
  void ReleaseDatabaseFromDBPool();

  /**
   * @fn
   * InTransactionMark
   * @brief set transaction mark
   * @param in_tran true - start transaction mark : false - end transaction mark
   */
  void InTransactionMark(const bool in_tran);

  /**
   * @fn
   * UpdateDatabaseStructure
   * @brief update database structure
   */
  virtual void UpdateDatabaseStructure();

  /**
   * @fn
   * GetDBPath
   * @brief get database path
   */
  std::string GetDBPath() const;

  /**
   * @fn
   * IsAccessiblePath
   * @brief determine whether exist path, and accssible
   * @parm(path) 
   * @return true- exist : false - not exist or not access
   */
  static bool IsAccessiblePath(std::wstring &path);

 protected:
  /**
   * @fn
   * Utf8ToUtf16
   * @brief convert utf8 to utf16
   * @param utf8 string
   * @return wide string
   */
  std::wstring Utf8ToUtf16(const std::string &utf8);

  /**
   * @fn
   * UTF16ToUTF8
   * @brief convert utf16(wstring) to utf8(string)
   * @param str wstring
   * @return converted utf8
   */
  std::string Utf16ToUtf8(const std::wstring &str);

  /**
   * @fn
   * GetFileCount
   * @brief get file count
   * @param utf16 string
   * @return int
   */
  int GetFileCount(std::wstring directory);

  /**
   * @fn
   * GetInternalDB
   * @brief get internal db
   * @return internal db instance
   */
  virtual db_manager::SmsDatabase GetInternalDB();

  db_manager::SmsDatabase internal_db_;
  std::string db_path_;
};

}  // namespace manager
}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_DB_MANAGER_SMS_BASE_DATABASE_H_
