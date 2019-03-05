/**
 * @file get_constructions.cc
 * @brief get constructions command implementation
 * @author duong.maixuan
 * @date 2018/07/15
 */

#include "command/construction/get_constructions.h"
#include <windows.h>
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

  const string NOT_FOUND_CDIR = "本棚（データフォルダ）が見つかりません！";
  const string READ_ERROR = "工事情報の取得に失敗しました！";
  const string UNKNOWN_KNACK = "要領不明";

/**
 * @fn
 * GoyoGetConstructions
 * @brief constructor
 */
GoyoGetConstructions::GoyoGetConstructions() {}

/**
 * @fn
 * ~GoyoGetConstructions
 * @brief destructor
 */
GoyoGetConstructions::~GoyoGetConstructions() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json 
 * @param (raw) raw string
 */
Json GoyoGetConstructions::ExecuteCommand(Json &request,
                                          string &raw) {
  wstring data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  try {
    wstring work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_database(data_dir, work_dir);
    vector<model::GoyoConstructionInfo> out_constructions;
    master_database.GetConstructionInfos(out_constructions);
    GoyoDatabase db = master_database.GetMasterDb();

    Json::array constructions = Json::array();
    for (auto &contruction : out_constructions) {
      Json construction = this->CreateConstruction(contruction, db);
      constructions.push_back(construction);
    }
    Json response = Json::object{ { "constructions", constructions }};
    return Json::object{{ "request", request }, { "response", response }};
    } catch (GoyoDatabaseException &ex) {
      GoyoErrorLog(ex.What());
      return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
    } catch (GoyoException &ex) {
      GoyoErrorLog(ex.what());
      return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
    }
}

/**
 * @fn
 * CreateConstruction
 * @param (info) bookrack id 
 * @param (db) display number
 * @brief create construction
 * @return construction object
 */
Json GoyoGetConstructions::CreateConstruction(
  model::GoyoConstructionInfo &info, GoyoDatabase &db) {
  try {
    // get knack
    Json knack = this->CreateKnack(info.GetKnackInfo(), db);

    // get contractor
    model::GoyoContractorInfo contactor_info = info.GetContractorInfo();
    Json::object contractor = Json::object{
      { "contractorId", contactor_info.GetContractorId() },
      { "contractorCode", contactor_info.GetContractorCode() },
      { "contractorName", contactor_info.GetContractorName() },
    };

    // get contractee
    model::GoyoContracteeInfo contactee_info = info.GetContracteeInfo();
    Json::object contractee = Json::object{
      { "contracteeId" , contactee_info.GetContracteeId() },
      { "contracteeCode", contactee_info.GetContracteeCode() },
      { "contracteeName", contactee_info.GetContracteeName() },
      { "largeCategory", contactee_info.GetLargeCategory() },
      { "middleCategory", contactee_info.GetMiddleCategory() },
      { "smallCategory", contactee_info.GetSmallCategory() }
    };

    // Read data?
    wstring data_dir = info.GetDataFolder();
    string constructor_name = info.GetConstructionName();
    if (this->ExistsFile(data_dir)) {
      if (info.GetKnackInfo().GetKnackId() <= 0) {
        constructor_name = READ_ERROR;
      } // else success
    } else {
      constructor_name = NOT_FOUND_CDIR;
    }
    string d_type = GoyoAppUtil::GetDriveTypeString(data_dir);

    Json::object construction = Json::object{
      { "constructionId", info.GetConstructionId() },
      { "displayNumber", info.GetDisplayNumber() },
      { "constructionNumber", info.GetConstructionNumber() },
      { "constructionName", constructor_name },
      { "startDate", info.GetStartDate() },
      { "endDate", info.GetEndDate() },
      { "dataFolder", this->ConvertWstring(info.GetDataFolder()) },
      { "driveType", d_type },
      { "isExternalFolder", info.GetExternalFolder() },
      { "isSharedFolder", info.GetSharedFolder() },
      { "cloudStorage", info.GetCloudStrage() },
      { "contractee", contractee },
      { "contractor", contractor },
      { "knack", knack },
      { "isSample", info.IsSample() },
    };

    // case kuraemon-connect
    auto year = info.GetConstructionYear();
    if (year) {
      construction["year"] = info.GetConstructionYear();
    } else {
      construction["year"] = "";
    }

    return construction;
  } catch (GoyoException &ex) {
    throw ex;
  }
}

/**
 * @fn
 * CreateKnack
 * @param (knack_info) knack info
 * @brief create knack
 * @return nack object
 */
Json GoyoGetConstructions::CreateKnack(
  model::GoyoKnackInfo &knack_info, GoyoDatabase &db) {
  try {
    GoyoStatement statement(db,
      u8"SELECT knackId, knackName, knackType from knack WHERE knackId = ?;");
    statement.Bind(1, knack_info.GetKnackId());
    string name = UNKNOWN_KNACK;
    int knackType = 0;
    if (statement.ExecuteStep()) {
      GoyoColumn name_col = statement.GetColumn(1);
      name = name_col.GetString();
      GoyoColumn type_col = statement.GetColumn(2);
      knackType = type_col.GetInt();
    }
    statement.Reset();
    return Json::object{
      { "knackId", knack_info.GetKnackId() },
      { "knackName", name },
      { "knackType", knackType },
    };
  } catch (GoyoDatabaseException &ex) {
    throw ex;
  }
}

}  // namespace goyo_bookrack_accessor
