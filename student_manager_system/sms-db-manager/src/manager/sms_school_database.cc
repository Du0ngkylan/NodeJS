/**
 * @file sms_school_database.cc
 * @brief sms school database object implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "sms_db/manager/sms_school_database.h"
#include <boost/filesystem.hpp>

using namespace std;
using namespace db_manager::model;
namespace fs = boost::filesystem;

namespace db_manager {
namespace manager {

/**
 * @fn
 * SmsSchoolDatabase
 * @brief constructor
 */
SmsSchoolDatabase::SmsSchoolDatabase() {}

/**
 * @fn
 * SmsSchoolDatabase
 * @brief constructor
 */
SmsSchoolDatabase::SmsSchoolDatabase(const std::wstring &parent_folder,
                             const std::wstring &working_folder) {
  parent_folder_ = parent_folder;
  working_folder_ = working_folder;
  SmsSchoolDatabase::InitializeDatabase();
}

/**
 * @fn
 * SmsSchoolDatabase
 * @brief copy constructor
 * @param (obj) source object
 */
SmsSchoolDatabase::SmsSchoolDatabase(db_manager::manager::SmsSchoolDatabase &obj)
  : SmsBaseDatabase(obj) {
  parent_folder_ = obj.parent_folder_;
  working_folder_ = obj.working_folder_;
}

/**
 * @fn
 * InitializeDatabase
 * @brief initialize database
 */
void SmsSchoolDatabase::InitializeDatabase() {
  wstring user = parent_folder_ + L"\\schoolDB.db";
  wstring org = working_folder_ + L"\\databases\\org_db\\schoolDB.db";
  const fs::wpath org_db(org);
  const fs::wpath user_db(user);
  try {
    if (!fs::is_directory(parent_folder_)) {
      fs::create_directories(parent_folder_);
    }
    if (!fs::exists(user_db)) {
      fs::copy_file(org_db, user_db);
    }
    db_path_ = Utf16ToUtf8(user);
    internal_db_ = SmsDatabase(db_path_, READ_WRITE);
    // SetCacheSize(GOYO_DB_CACHE_SIZE);
    // SetWalMode();
  } catch (fs::filesystem_error) {
    throw SmsDatabaseException("filesystem error");
  }
}

/**
 * @fn
 * ~SmsSchoolDatabase
 * @brief destructor
 */
SmsSchoolDatabase::~SmsSchoolDatabase() {}

/**
 * @fn
 * GetSchoolDB
 * @brief get school db
 * @return db instance
 */
SmsDatabase SmsSchoolDatabase::GetSchoolDB() {
  return internal_db_;
}

/**
 * @fn
 * BeginTransaction
 * @brief begin transaction
 */
void SmsSchoolDatabase::BeginTransaction() {
  this->GetSchoolDB().ExecSQL("BEGIN");
}

/**
 * @fn
 * Commit
 * @brief commit transaction
 */
void SmsSchoolDatabase::Commit() {
  this->GetSchoolDB().ExecSQL("COMMIT");
}

/**
 * @fn
 * Rollback
 * @brief rollback transaction
 */
void SmsSchoolDatabase::Rollback() {
  try {
    this->GetSchoolDB().ExecSQL("ROLLBACK");
  } catch (SmsDatabaseException) {
    // exceptions that occurred with rollback can not be recovered
  }
}

/**
 * @fn
 * GetMaxItemId
 * @brief get max current id in database
 * @return int id
 */
int SmsSchoolDatabase::GetMaxItemId(const std::string item_name,
                                const std::string table_name) {
  try {
    SmsStatement statement(this->GetSchoolDB(),
        u8"SELECT MAX(" + item_name + ") FROM " + table_name + ";");
    auto max_item_id = 0;
    if (statement.ExecuteStep()) {
      max_item_id = statement.GetColumn(0).GetInt();
    }
    statement.Reset();
    return max_item_id;
  } catch (SmsDatabaseException &ex) {
    throw ex;
  } catch (std::exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}

/**
 * @fn
 * CreateSchoolInfo
 * @brief create school info
 * @param info
 */
int SmsSchoolDatabase::CreateSchoolInfo(SmsSchoolInfo &info) {
  try {
    this->BeginTransaction();
    SmsStatement statement(this->GetSchoolDB(),
        u8"INSERT INTO schoolDetail (internalSchoolId, schoolName, "
        u8"schoolYear, schoolNumber, classTotalCount) VALUES (?,?,?,?,?);");
    statement.Bind(1, info.GetSchoolId());
    statement.Bind(2, info.GetSchoolName());
    statement.Bind(3, info.GetSchoolYear());
    statement.Bind(4, info.GetSchoolNumber());
    statement.Bind(5, info.GetClassTotalCount());
    statement.Execute();
    statement.Reset();
    this->Commit();
    return info.GetSchoolId();
    this->Rollback();
  } catch (SmsDatabaseException& ex) {
    throw ex;
  } catch (exception &ex) {
    throw SmsDatabaseException(ex.what());
  }
}


}  // namespace manager
}  // namespace db_manager
