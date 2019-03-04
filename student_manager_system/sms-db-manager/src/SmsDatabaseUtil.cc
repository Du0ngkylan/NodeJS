/**
 * @file SmsDatabaseUtil.cc
 * @brief goyo database utility implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "SmsDatabaseUtil.h"
#include <iostream>
#include <windows.h>

namespace db_manager {

  /**
   * @fn
   * GetMasterDatabase
   * @param database_root_path database root path
   * @brief get master database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetMasterDatabase(const std::string &database_root_path) {
    SmsDatabase db(":memory:", db_manager::GoyoOpenMode::READ_ONLY);
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/corins.db' AS corins_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/mlt1.db' AS mlt1_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/tecris.db' AS tecris_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/jusho.db' AS jusho_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/kenchiku.db' AS kenchiku_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/koushu.db' AS koushu_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/bunrui.db' AS bunrui_db;");

    return db;
  }

  /**
   * @fn
   * GetIdMasterDatabase
   * @param database_root_path database root path
   * @brief get id master database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetIdMasterDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/idmaster.db", db_manager::GoyoOpenMode::READ_ONLY);
  }
  /**
   * @fn
   * GetCalsDatabase
   * @param database_root_path database root path
   * @brief get cals database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetCalsDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/cals.db", db_manager::GoyoOpenMode::READ_ONLY);        
  }

  /**
   * @fn
   * GetGPhotoDatabase
   * @param database_root_path database root path
   * @brief get g_photo database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetGPhotoDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/g_photo.db", db_manager::GoyoOpenMode::READ_ONLY);        
  }

  /**
   * @fn
   * GetPhotoSumDatabase
   * @param database_root_path database root path
   * @brief get photo sum database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetPhotoSumDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/photosum.db", db_manager::GoyoOpenMode::READ_ONLY);        
  }

  /**
   * @fn
   * GetKoujiMasterDatabase
   * @param database_root_path database root path
   * @brief get koujimaster database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetKoujiMasterDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/koujimaster.db", db_manager::GoyoOpenMode::READ_ONLY);        
  }

  /**
   * @fn
   * GetCodeDatabase
   * @param database_root_path database root path
   * @brief get code database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetCodeDatabase(const std::string &database_root_path) {
    SmsDatabase db(":memory:", db_manager::GoyoOpenMode::READ_ONLY);

    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/corins.db' AS corins_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/mlt1.db' AS mlt_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/tecris.db' AS tecris_db;");
    db.ExecSQL("ATTACH DATABASE '" + database_root_path + "/jusho.db' AS jusho_db;");

    return db;
  }

  /**
   * @fn
   * GetKenchikuDatabase
   * @param database_root_path database root path
   * @brief get kenchiku database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetKenchikuDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/kenchiku.db", db_manager::GoyoOpenMode::READ_ONLY);    
  }

  /**
   * @fn
   * GetKoushuDatabase
   * @param database_root_path database root path
   * @brief get koushu database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetKoushuDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/koushu.db", db_manager::GoyoOpenMode::READ_ONLY);    
  }

  /**
   * @fn
   * GetBunruiDatabase
   * @param database_root_path database root path
   * @brief get bunrui database
   * @return database instance
   */
  SmsDatabase SmsDatabaseUtil::GetBunruiDatabase(const std::string &database_root_path) {
    return SmsDatabase(database_root_path + "/bunrui.db", db_manager::GoyoOpenMode::READ_ONLY);    
  }

  /**
   * @fn
   * ConvertUTF8ToSJIS
   * @param utf8 utf8 string
   * @brief convert UTF-8 to SJIS
   * @return SJIS string
   */
  std::string SmsDatabaseUtil::ConvertUTF8ToSJIS(const std::string& srcUTF8) {
    int lenghtUnicode = MultiByteToWideChar(CP_UTF8, 0, srcUTF8.c_str(), srcUTF8.size() + 1, NULL, 0);

    wchar_t* bufUnicode = new wchar_t[lenghtUnicode];

    MultiByteToWideChar(CP_UTF8, 0, srcUTF8.c_str(), srcUTF8.size() + 1, bufUnicode, lenghtUnicode);

    int lengthSJis = WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, -1, NULL, 0, NULL, NULL);

    char* bufShiftJis = new char[lengthSJis];

    WideCharToMultiByte(CP_THREAD_ACP, 0, bufUnicode, lenghtUnicode + 1, bufShiftJis, lengthSJis, NULL, NULL);

    std::string strSJis(bufShiftJis);

    delete bufUnicode;
    delete bufShiftJis;
    return strSJis;
  }

}  // namespace db_manager
