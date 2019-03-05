/**
 * @file update_construction_order.cc
 * @brief update construction order command implementation
 * @author le giap
 * @date 2018/03/26
 */

#include <boost/filesystem.hpp>
#include "command/construction/update_construction_order.h"
#include "goyo_db_if.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace pt = boost::property_tree;
namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoUpdateConstructionOrder
 * @brief constructor
 */
GoyoUpdateConstructionOrder::GoyoUpdateConstructionOrder() {
  m_data_dir = this->GetGoyoAppDataDirectory();
}

/**
 * @fn
 * ~GoyoUpdateConstructionOrder
 * @brief destructor
 */
GoyoUpdateConstructionOrder::~GoyoUpdateConstructionOrder() = default;

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 */
Json GoyoUpdateConstructionOrder::ExecuteCommand(Json& request, string& raw) {
  // validate arguments
  auto& constructionsJson = request["args"]["constructions"];
  if (constructionsJson.is_null() || !constructionsJson.is_array()) {
    const string message = "'args.constructions' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  map<int, int> constructions;
  for (auto& it : constructionsJson.array_items()) {
    auto constructionId = GetIntFJson(it["constructionId"]);
    auto displayNumber = GetIntFJson(it["displayNumber"]);
    constructions[constructionId] = displayNumber;
  }
  try {
    const auto workingDir = GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase masterDb(m_data_dir, workingDir);
    auto count = masterDb.UpdateDisplayNumberConstruction(constructions);
    Json response = Json::object{{"updateCount", count}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (GoyoException& ex) {
    return this->CreateErrorResponse(request, kErrorIOStr, ex.what());
  } catch (GoyoDatabaseException& ex) {
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
  }
}

int GoyoUpdateConstructionOrder::UpdateConstruction(const Json& construction) {
  model::GoyoConstructionInfo constructionInfo{};
  GetConstructionInfo(constructionInfo, construction);

  const auto workingDir = GetGoyoWorkDirectory();
  try {
    manager::GoyoMasterDatabase masterDb(m_data_dir, workingDir);

    GoyoStatement statement(masterDb.GetMasterDb(),
                            u8"SELECT displayNumber FROM "
                            u8"construction WHERE constructionId = ?;");
    statement.Bind(1, constructionInfo.GetConstructionId());
    auto displayNumberUpdate = 0;
    if (statement.ExecuteStep()) {
      displayNumberUpdate = statement.GetColumn(0).GetInt();
    }
    if (displayNumberUpdate != constructionInfo.GetDisplayNumber()) {
      masterDb.UpdateConstruction(constructionInfo);
      return 1;
    }
    return 0;
  } catch (GoyoDatabaseException& ex) {
    throw GoyoException(ex.What());
  }
}

void GoyoUpdateConstructionOrder::GetConstructionInfo(
    model::GoyoConstructionInfo& info, const Json& construction) {
  try {
    if (!construction.is_null()) {
      auto& constructionIdJson = construction["constructionId"];
      info.SetConstructionId(GetIntFJson(constructionIdJson));

      // dataFolder
      auto& dataFolderJson = construction["dataFolder"];
      auto dataFolder = GetWStringFJson(dataFolderJson);
      info.SetDataFolder(dataFolder);

      // displayNumber
      auto& displayNumberJson = construction["displayNumber"];
      info.SetDisplayNumber(GetIntFJson(displayNumberJson));

      // isExternalFolder
      auto& isExternalFolderJson = construction["isExternalFolder"];
      info.SetExternalFolder(GetBoolFJson(isExternalFolderJson));

      // isExternalFolder
      auto& isSharedFolderJson = construction["isExternalFolder"];
      info.SetSharedFolder(GetBoolFJson(isSharedFolderJson));

      // cloud Strage
      auto& cloudStrageJson = construction["cloudStrage"];
      info.SetCloudStrage(GetIntFJson(cloudStrageJson));

    } else {
      throw GoyoException("data construction json invalid");
    }
  } catch (GoyoException& ex) {
    GoyoErrorLog(ex.What());
    throw GoyoException(ex.What());
  }
}

}  // namespace goyo_bookrack_accessor
