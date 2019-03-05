/**
 * @file sync_construction.cc
 * @brief sync construction (all databases)
 * @author yonaha
 * @date 2018/11/09
 */

#include "command/construction/sync_construction.h"
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoSyncConstruction
 * @brief constructor
 */
GoyoSyncConstruction::GoyoSyncConstruction() {}

/**
 * @fn
 * ~GoyoSyncConstruction
 * @brief destructor
 */
GoyoSyncConstruction::~GoyoSyncConstruction() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json GoyoSyncConstruction::ExecuteCommand(Json &request, string &raw) {
    auto data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"Not found GoyoAppDataDirectory " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  auto &j_construction_id = request["args"]["constructionId"];
  int construction_id = 0;
  if (!j_construction_id.is_null() && j_construction_id.is_number()) {
    construction_id = j_construction_id.int_value();
  }
  auto &j_album_id = request["args"]["albumId"];
  int album_id = 0;
  if (!j_album_id.is_null() && j_album_id.is_number()) {
    album_id = j_album_id.int_value();
  }

  try {
    if (construction_id > 0) {
      auto work_dir = this->GetGoyoWorkDirectory();
      manager::GoyoMasterDatabase master_db(data_dir, work_dir);
      auto &construction_db = master_db.GetConstructionDatabase(construction_id);
      auto &album_item_db = construction_db.GetAlbumItemDatabase();
      GoyoDebugLog("release db : " + album_item_db.GetDBPath());
      album_item_db.ReleaseDatabaseFromDBPool();
      if (album_id > 0) {
        auto &bookrack_db = construction_db.GetBookrackDatabase();
        auto &album_db = bookrack_db.GetAlbumDatabase(album_id);
        GoyoDebugLog("release db : " + album_db.GetDBPath());
        album_db.ReleaseDatabaseFromDBPool();
      }
    } else {
      // all related dbs must be deleted from the pool
      // (do not choice db, clear all)
      GoyoDebugLog("release dbs");
      GoyoDatabase::ClearDBPool();
    }
    Json response = Json::object{{"status", "ok" }};
    return Json::object{{"request", request}, {"response", response}};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  }
}

}  // namespace goyo_bookrack_accessor
