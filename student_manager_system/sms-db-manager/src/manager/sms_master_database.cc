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
 * GetAllFileInFolder
 * @brief Get all file in folder
 * @param root path root folder
 * @param out_paths output list file
 */
static inline void GetAllFileInFolder(const wstring& root,
                                      vector<fs::path>& out_paths) {
  if (!fs::exists(root) || !fs::is_directory(root)) return;
  fs::path rootPath(root);
  fs::recursive_directory_iterator it(rootPath);
  const fs::recursive_directory_iterator endit;

  while (it != endit) {
    if (fs::is_regular_file(*it)) out_paths.push_back(it->path());
    ++it;
  }
}

/**
 * @fn
 * GetAllFoldersInFolder
 * @brief get all folder in folder
 * @param data_folder delete folder
 */
static inline void GetAllFoldersInFolder(wstring data_folder,
                                         vector<fs::path>& out_paths) {
  if (!fs::exists(data_folder) || !fs::is_directory(data_folder)) return;
  fs::path root_path(data_folder);
  fs::recursive_directory_iterator it(root_path);
  const fs::recursive_directory_iterator endit;
  while (it != endit) {
    if (fs::is_directory(*it)) out_paths.push_back(it->path());
    ++it;
  }
}

/**
 * @fn
 * OutputProgress
 * @brief output progress
 * @param done
 * @param total
 * @param msg
 */
static inline void OutputProgress(int done, int total, string msg) {
  cout << "{\"progress\":"
  << "{\"done\":" << done
  << ", \"total\":" << total
  << ", \"working\":\"" << msg << "\"}}" << std::endl;
}

/**
 * @fn
 * DeleteFolders
 * @brief get all folder in folder
 * @param root
 * @param paths delete folder
 * @param done
 * @param total
 */
static inline void DeleteFolders(wstring root, vector<fs::path>& paths,
                                 int done, int total) {
  total += 1;
  boost::system::error_code error;
  for (auto it = paths.rbegin(); it != paths.rend(); ++it) {
    auto &p = it->wstring();
    if (fs::exists(p, error)) {
      fs::remove_all(p, error);
    }
    OutputProgress(++done, total, "delete folder");
  }
  fs::path root_folder(root);
  if (fs::exists(root_folder, error)) {
    fs::remove_all(root_folder, error);
    OutputProgress(++done, total, "delete root folder");
  }
}

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
 * ~SmsMasterDatabase
 * @brief destructor
 */
SmsMasterDatabase::~SmsMasterDatabase() {}

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
    // this->GetMasterDB();
    internal_db_ = SmsDatabase(db_path_, READ_WRITE);
    // this->UpdateDatabaseStructure();
  } catch (...) {
    throw SmsDatabaseException("Initialize SmsMasterDatabase FAIL");
  }
}

/**
 * @fn
 * GetDataFolder
 * @brief get DataFolder of School with id
 * @param school_id
 */
std::wstring SmsMasterDatabase::GetDataFolder(int school_id) {
  try {
    SmsStatement statement(
        this->GetMasterDB(),
        u8"SELECT dataFolder FROM schools WHERE schoolId = ?; ");
    statement.Bind(1, school_id);
    if (statement.ExecuteStep()) {
      const auto dataFolder = Utf8ToUtf16(statement.GetColumn(0).GetString());
      if (fs::exists(dataFolder)) {
        return dataFolder;
      }
      throw SmsDatabaseException("DataFolder of school not exits");
    }
    statement.Reset();
  } catch (SmsDatabaseException& ex) {
    throw ex;
  } catch (std::exception&) {
    throw SmsDatabaseException("GetDataFolder fail");
  }
  return {};
}

/**
 * @fn
 * GetMasterDB
 * @brief get master db
 * @return db instance
 */
SmsDatabase &SmsMasterDatabase::GetMasterDB() {
  return internal_db_;
}

/**
 * @fn
 * BeginTransaction
 * @brief begin transaction
 */
void SmsMasterDatabase::BeginTransaction() {
  this->GetMasterDB().ExecSQL("BEGIN");
}

/**
 * @fn
 * Commit
 * @brief commit transaction
 */
void SmsMasterDatabase::Commit() {
  this->GetMasterDB().ExecSQL("COMMIT");
}

/**
 * @fn
 * Rollback
 * @brief rollback transaction
 */
void SmsMasterDatabase::Rollback() {
  try {
    this->GetMasterDB().ExecSQL("ROLLBACK");
  } catch (SmsDatabaseException) {
    // exceptions that occurred with rollback can not be recovered
  }
}

/**
 * @fn
 * UpdateDatabaseStructure
 * @brief update database structure
 */
void SmsMasterDatabase::UpdateDatabaseStructure() {
  // auto current_ver = this->GetCurrentVersion();

  // if (current_ver.GetVersionId() < 0.02) {
  //   try {
  //     this->GetMasterDB().ExecSQL("ALTER TABLE construction ADD COLUMN `isSample`	integer NOT NULL DEFAULT 0 ;");
  //     GoyoVersionHistory new_ver(0.02, u8"add isSample field to construction table");
  //     this->UpdateVersion(new_ver);
  //   } catch (GoyoDatabaseException) {
  //     // exceptions that occurred with rollback can not be recovered
  //   }
  // }
}

/**
 * @fn
 * GetSchoolDatabase
 * @brief Get database SchoolDatabase
 * @param school_id if of SmsSchoolInfo
 * @return object GetSchoolDatabase
 */
SmsSchoolDatabase SmsMasterDatabase::GetSchoolDatabase(const int school_id) {
  try {
    auto info = GetSchoolInfo(school_id);
    if (info.GetSchoolId() == -1 || !fs::exists(info.GetDataFolder())) {
      throw SmsDatabaseException("not found school");
    }
    SmsSchoolDatabase db(info.GetDataFolder(), working_folder_);
    return db;
  } catch (SmsDatabaseException& ex) {
    throw ex;
  }
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
 * GetSchoolInfo
 * @brief Get a SmsSchoolInfo in database
 * @param school_id id of SmsSchoolInfo
 * @return SmsSchoolInfo object
 */
SmsSchoolInfo SmsMasterDatabase::GetSchoolInfo(const int school_id) {
  try {
    SmsSchoolInfo info;
    SmsStatement statement(this->GetMasterDB(),
      u8"SELECT dataFolder, displayNumber "
      u8"FROM schools WHERE schoolId = ?;");
    statement.Bind(1, school_id);

    if (statement.ExecuteStep()) {
      const auto data_folder = statement.GetColumn(0).GetString();
      const auto display_number = statement.GetColumn(1).GetInt();
      statement.Reset();

      auto w_data_folder = Utf8ToUtf16(data_folder);
      info.SetSchoolId(school_id);
      info.SetDataFolder(w_data_folder);
      info.SetDisplayNumber(display_number);
    }
    return info;
  } catch (SmsDatabaseException& ex) {
    throw ex;
  } catch (std::exception&) {
    throw SmsDatabaseException("GetSchoolInfo fail");
  }
}

/**
 * @fn
 * GetSchoolInfoDetail
 * @brief Get a SmsSchoolInfo in database
 * @param school_id id of SmsSchoolInfo
 * @return SmsSchoolInfo object
 */
SmsSchoolInfo SmsMasterDatabase::GetSchoolInfoDetail(const int school_id) {
  try {
    SmsSchoolInfo info;
    info.SetSchoolId(0);
    SmsStatement statement(this->GetMasterDB(),
        u8"SELECT dataFolder, displayNumber "
        u8"FROM schools WHERE schoolId = ?;");
    statement.Bind(1, school_id);
    if (statement.ExecuteStep()) {
      const auto data_folder = statement.GetColumn(0).GetString();
      const auto display_number = statement.GetColumn(1).GetInt();
      auto w_data_folder = Utf8ToUtf16(data_folder);

      try {
        if (fs::exists(w_data_folder)) {
          SmsSchoolDatabase db(w_data_folder, working_folder_);
          info = db.GetSchoolInfo(school_id);
        }
      } catch (SmsDatabaseException) {
        // skip the exception, because create error response by command side
      } catch (boost::filesystem::filesystem_error) {
        // skip the exception, because create error response by command side
        //  disconnect network disk
      }
      info.SetSchoolId(school_id);
      info.SetDataFolder(w_data_folder);
      info.SetDisplayNumber(display_number);
    }
    statement.Reset();
    return info;
  } catch (SmsDatabaseException& ex) {
    throw ex;
  } catch (std::exception&) {
    throw SmsDatabaseException("GetSchoolInfoDetail fail");
  }
}

/**
 * @fn
 * GetSchoolInfos
 * @brief Get all SmsSchoolInfo in database
 * @param out_schools receive list SmsSchoolInfo
 * @return list SmsSchoolInfo
 */
void SmsMasterDatabase::GetSchoolInfos(
    std::vector<SmsSchoolInfo>& out_schools) {
  try {
    SmsStatement statement(this->GetMasterDB(),
        u8"SELECT schoolId, dataFolder, displayNumber "
        u8"FROM schools ORDER BY displayNumber ASC;");

    while (statement.ExecuteStep()) {
      const auto school_id = statement.GetColumn(0).GetInt();
      const auto data_folder = statement.GetColumn(1).GetString();
      const auto display_number = statement.GetColumn(2).GetInt();
      auto w_data_folder = Utf8ToUtf16(data_folder);
      // DWORD sdsize;
      // PSECURITY_DESCRIPTOR psd;
      // psd = GlobalAlloc(GMEM_FIXED, 1000);

      SmsSchoolInfo info;
      try {
        // bool bRet = GetFileSecurity(
        //   w_data_folder.c_str(),
        //   OWNER_SECURITY_INFORMATION,
        //   psd,
        //   1000,
        //   &sdsize);
        // if (bRet) {
        //   if (fs::exists(w_data_folder)) {
        //     SmsConstructionDatabase db(w_data_folder, working_folder_);
        //     info = db.GetConstructionInfo();
        //   }
        // }
        if (IsAccessiblePath(w_data_folder)) {
          SmsSchoolDatabase db(w_data_folder, working_folder_);
          info = db.GetSchoolInfo(school_id);
        }
      } catch (SmsDatabaseException) {
        // skip the exception, because create error response by command side
      } catch (boost::filesystem::filesystem_error) {
        // skip the exception, because create error response by command side
        //  disconnect network disk
      }
      // GlobalFree(psd);
      info.SetSchoolId(school_id);
      info.SetDataFolder(w_data_folder);
      info.SetDisplayNumber(display_number);
      out_schools.push_back(info);
    }
    statement.Reset();
  } catch (SmsDatabaseException& ex) {
    throw ex;
  } catch (std::exception&) {
    throw SmsDatabaseException("GetShoolInfos fail");
  }
}

/**
 * @fn
 * UpdateSchool
 * @brief update a SmsSchoolInfo in database
 * @param info SmsSchoolInfo to update
 */
void SmsMasterDatabase::UpdateSchool(SmsSchoolInfo& school_info) {
  auto dataFolder = GetDataFolder(school_info.GetSchoolId());
  if (dataFolder.empty()) {
    CreateSchool(school_info);
  } else {
    const auto dataFolderUpdate = school_info.GetDataFolder();
    try {
      SmsStatement statement(
          this->GetMasterDB(),
          u8"UPDATE schools SET dataFolder = ?, displayNumber = ? "
          u8"WHERE schoolId = ?; ");
      statement.Bind(1, Utf16ToUtf8(school_info.GetDataFolder()));
      statement.Bind(2, school_info.GetDisplayNumber());
      statement.Bind(3, school_info.GetSchoolId());
      statement.Execute();
      statement.Reset();

      if (dataFolder != dataFolderUpdate) {
        if (!fs::exists(dataFolderUpdate)) {
          fs::path dest(dataFolderUpdate);
          create_directories(dest);
        }

        // all related dbs must be deleted from the pool
        // (do not choice db, clear all)
        SmsDatabase::ClearDBPool();

        // Copy all files construction_old to new construction folder
        vector<fs::path> srcFiles;
        GetAllFileInFolder(dataFolder, srcFiles);
        vector<fs::path> folders;
        GetAllFoldersInFolder(dataFolder, folders);
        int total = srcFiles.size() + folders.size();
        int done = 0;
        if (srcFiles.empty())
          throw SmsDatabaseException("Folder school empty");
        for (auto& src : srcFiles) {
          wstring pathUpdate = src.c_str();
          pathUpdate =
              pathUpdate.replace(0, dataFolder.length(), dataFolderUpdate);
          fs::path dest(pathUpdate);
          create_directories(dest.parent_path());
          copy_file(src, dest);
          OutputProgress(++done, total, "copy file");
        }
        DeleteFolders(dataFolder, folders, done, total);
      }
      SmsSchoolDatabase db(school_info.GetDataFolder(), working_folder_);
      //db.UpdateSchoolInfo(school_info);
    } catch (SmsDatabaseException& ex) {
      auto pathUpdateRemove(dataFolderUpdate);
      if (fs::exists(pathUpdateRemove)) fs::remove_all(pathUpdateRemove);
      throw ex;
    } catch (std::exception&) {
      auto pathUpdateRemove(dataFolderUpdate);
      if (fs::exists(pathUpdateRemove)) fs::remove_all(pathUpdateRemove);
      throw SmsDatabaseException("UpdateSchoolInfo fail");
    }
  }
}

/**
 * @fn
 * DeleteSchool
 * @brief Delete a row in database of school
 * @param info SmsSchoolInfo to delete
 * @param delete_dir delete directory - true : otherwise - false
 */
void SmsMasterDatabase::DeleteSchool(SmsSchoolInfo& school_info,
                                     bool delete_dir) {
  auto dataFolder = school_info.GetDataFolder();
  const fs::wpath data(dataFolder);
  const fs::wpath dataDel(dataFolder + L"_del_");

  // accessible?
  try {
    if (delete_dir == true && !fs::exists(data)) {
      delete_dir = false;
    }
  } catch (std::exception&) {
      delete_dir = false;
  }
  try {
    // all related dbs must be deleted from the pool
    // (do not choice db, clear all)
    SmsDatabase::ClearDBPool();
    if (delete_dir) {
      fs::rename(data, dataDel);
      this->BeginTransaction();
      this->DeleteSchoolInfo(school_info);
      this->Commit();
      vector<fs::path> folders;
      wstring del_f = dataDel.wstring();
      GetAllFoldersInFolder(del_f, folders);
      DeleteFolders(del_f, folders, 0, folders.size());
    } else {
      this->BeginTransaction();
      this->DeleteSchoolInfo(school_info);
      this->Commit();
    }
  } catch (SmsDatabaseException& ex) {
    if (delete_dir) {
      boost::system::error_code error;
      fs::rename(dataDel, data, error);
    }
    this->Rollback();
    throw ex;
  } catch (std::exception&) {
    if (delete_dir) {
      boost::system::error_code error;
      fs::rename(dataDel, data, error);
    }
    this->Rollback();
    throw SmsDatabaseException("DeleteSchool fail");
  }
}

/**
 * @fn
 * DeleteSchoolInfo
 * @brief Delete a row in database of school
 * @param info SmsSchoolInfo to delete
 */
void SmsMasterDatabase::DeleteSchoolInfo(SmsSchoolInfo& info) {
  auto school_id = info.GetSchoolId();
  auto detail = GetSchoolInfoDetail(school_id);
  SmsStatement statement(this->GetMasterDB(),
      u8"DELETE FROM schools WHERE schoolId = ?;");
  statement.Bind(1, school_id);
  statement.Execute();
  statement.Reset();
}

}  // namespace manager
}  // namespace db_manager
