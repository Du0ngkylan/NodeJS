/**
 * @file sms_master_database.cc
 * @brief sms master database object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/manager/sms_master_database.h"
#include <boost/filesystem.hpp>
#include <iostream>

using namespace std;
using namespace db_manager::model;
namespace fs = boost::filesystem;

namespace db_manager {
namespace manager {

/**
 * @fn
 * SmsMasterDatabase
 * @brief constructor
 */
SmsMasterDatabase::SmsMasterDatabase() {}

/**
 * @fn
 * SmsMasterDatabase
 * @brief constructor
 * @param parent_folder data folder
 */
SmsMasterDatabase::SmsMasterDatabase(const std::wstring &parent_folder,
                                     const std::wstring &working_folder) {
  parent_folder_ = parent_folder;
  working_folder_ = working_folder;
  SmsMasterDatabase::InitializeDatabase();
}

/**
 * @fn
 * SmsMasterDatabase
 * @brief copy constructor
 * @param obj source object
 */
SmsMasterDatabase::SmsMasterDatabase(
  db_manager::manager::SmsMasterDatabase &obj) {
  parent_folder_ = obj.parent_folder_;
  working_folder_ = obj.working_folder_;
}

 /**
  * @fn
  * InitializeDatabase
  * @brief initialize database
  */
void SmsMasterDatabase::InitializeDatabase() {
  const auto user = parent_folder_;
  auto org = working_folder_ + L"\\databases\\org_db\\masterDB.db";
  const auto uft8_folder = Utf16ToUtf8(user + L"\\masterDB.db");

  const fs::path org_db(org);
  const fs::path user_db(user + L"\\masterDB.db");
  try {
    if (!fs::is_directory(user)) {
      fs::create_directories(user);
    }
    auto u = user_db.wstring();
    if (!IsAccessiblePath(u)) {
      fs::copy_file(org_db, user_db);
    }
    db_path_ = uft8_folder;
    //this->GetMasterDb();
    internal_db_ = SmsDatabase(db_path_, READ_WRITE);
    this->UpdateDatabaseStructure();
  } catch (...) {
    throw SmsDatabaseException("Initialize SmsMasterDatabase FAIL");
  }
}

/**
 * @fn
 * ~SmsMasterDatabase
 * @brief destructor
 */
SmsMasterDatabase::~SmsMasterDatabase() {}

/**
 * @fn
 * CreateSchool
 * @brief record a SmsSchoolInfo to database
 * @param is_import
 * @return int status
 */
int SmsMasterDatabase::CreateSchool(SmsSchoolInfo& school_info,
                                    bool is_import) {
  try {
    auto max_school_id = GetMaxItemId("schoolId", "schools");
    auto max_display_number = GetMaxItemId("displayNumber", "schools");
    school_info.SetSchoolId(++max_school_id);
    SmsStatement statement(this->GetMasterDB(),
        "INSERT INTO schools (schoolId, dataFolder, displayNumber) "
        "VALUES (?, ?, ?); ");
    statement.Bind(1, school_info.GetSchoolId());
    statement.Bind(2, Utf16ToUtf8(school_info.GetDataFolder()));
    statement.Bind(3, ++max_display_number);
    statement.Execute();
    statement.Reset();

    if (is_import == false) {
      const fs::wpath parent(school_info.GetDataFolder());
      // empty directory?
      if (is_directory(parent)) {
        auto cnt = this->GetFileCount(school_info.GetDataFolder());
        if (0 < cnt) {
          throw SmsDatabaseException("school Folder is not empty.");
        }
      }
      SmsSchoolDatabase db(school_info.GetDataFolder(), working_folder_);
      db.CreateSchoolInfo(school_info);
    }
    return (max_school_id);
  } catch (SmsDatabaseException& ex) {
    fs::remove_all(school_info.GetDataFolder());
    throw ex;
  } catch (std::exception&) {
    fs::remove_all(school_info.GetDataFolder());
    throw SmsDatabaseException("CreateConstruction fail");
  }
}

/**
 * @fn
 * GetMasterDB
 * @brief get master db
 * @return db instance
 */
SmsDatabase SmsMasterDatabase::GetMasterDB() {
  return internal_db_;
}

/**
 * @fn
 * GetMaxItemId
 * @brief get max current id in database
 * @return int id
 */
int SmsMasterDatabase::GetMaxItemId(const std::string &item_name,
                                    const std::string &table_name) {
  try {
    SmsStatement statement(this->GetMasterDB(),
      u8"SELECT MAX(" + item_name + ") FROM " + table_name + ";");
    auto max = 0;
    if (statement.ExecuteStep()) {
      max = statement.GetColumn(0).GetInt();
    }
    statement.Reset();
    return max;
  } catch (...) {
    throw SmsDatabaseException("Get Max: " + item_name + " Fail");
  }
}

}  // namespace manager
}  // namespace db_manager
