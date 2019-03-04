/**
 * @file SmsDatabaseUtil.h
 * @brief Sms database utility header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_DB_MANAGER_INCLUDE_GOYODBUTIL_H_
#define SMS_DB_MANAGER_INCLUDE_GOYODBUTIL_H_

#include <string>
#include "sms_db/SmsDatabase.h"

namespace db_manager {

/**
 * @class SmsDatabaseUtil
 * @brief goyo database utility
 */
class SmsDatabaseUtil {
 public:
  /**
   * @fn
   * GetMasterDatabase
   * @param database_root_path database root path
   * @brief get master database
   * @return database instance
   */
  static SmsDatabase GetMasterDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetIdMasterDatabase
   * @param database_root_path database root path
   * @brief get id master database
   * @return database instance
   */
  static SmsDatabase GetIdMasterDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetCalsDatabase
   * @param database_root_path database root path
   * @brief get cals database
   * @return database instance
   */
  static SmsDatabase GetCalsDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetGPhotoDatabase
   * @param database_root_path database root path
   * @brief get g_photo database
   * @return database instance
   */
  static SmsDatabase GetGPhotoDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetPhotoSumDatabase
   * @param database_root_path database root path
   * @brief get photo sum database
   * @return database instance
   */
  static SmsDatabase GetPhotoSumDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetKoujiMasterDatabase
   * @param database_root_path database root path
   * @brief get koujimaster database
   * @return database instance
   */
  static SmsDatabase GetKoujiMasterDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetCodeDatabase
   * @param database_root_path database root path
   * @brief get code database
   * @return database instance
   */
  static SmsDatabase GetCodeDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetKenchikuDatabase
   * @param database_root_path database root path
   * @brief get kenchiku database
   * @return database instance
   */
  static SmsDatabase GetKenchikuDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetKoushuDatabase
   * @param database_root_path database root path
   * @brief get koushu database
   * @return database instance
   */
  static SmsDatabase GetKoushuDatabase(const std::string &database_root_path);

  /**
   * @fn
   * GetBunruiDatabase
   * @param database_root_path database root path
   * @brief get bunrui database
   * @return database instance
   */
  static SmsDatabase GetBunruiDatabase(const std::string &database_root_path);

  /**
   * @fn
   * convertUTF8ToSJIS
   * @param utf8 utf8 string
   * @brief convert UTF-8 to SJIS
   * @return SJIS string
   */
  static std::string ConvertUTF8ToSJIS(const std::string &utf8);
};

}  // namespace db_manager

#endif  // DB_MANAGER_INCLUDE_GOYODBUTIL_H_
