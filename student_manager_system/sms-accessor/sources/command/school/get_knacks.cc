/**
 * @file get_knacks.cc
 * @brief get knacks command implementation
 * @author duong.maixuan
 * @date 2018/10/17
 */

#include "command/construction/get_knacks.h"
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoGetKnacks
 * @brief constructor
 */
GoyoGetKnacks::GoyoGetKnacks() {}

/**
 * @fn
 * ~GoyoGetKnacks
 * @brief destructor
 */
GoyoGetKnacks::~GoyoGetKnacks() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json GoyoGetKnacks::ExecuteCommand(Json &request, string &raw) {
  wstring data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  try {
    wstring work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(data_dir, work_dir);
    vector<model::GoyoKnackInfo> out_knacks;
    master_db.GetKnackInfos(out_knacks);
    Json::array knacks = Json::array();
    for (auto &info : out_knacks) {
      Json knack = Json::object{{"knackId", info.GetKnackId()},
                                {"knackName", info.GetKnackName()},
                                {"knackType", info.GetKnackType()}};
      knacks.push_back(knack);
    }
    Json response = Json::object{{"knacks", knacks }};
    return Json::object{{"request", request}, {"response", response}};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  }
}

}  // namespace goyo_bookrack_accessor
