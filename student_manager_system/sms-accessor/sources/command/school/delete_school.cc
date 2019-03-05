/**
 * @file delete_construction.cc
 * @brief delete construction command implementation
 * @author le giap
 * @date 2018/07/25
 */

#include "command/construction/delete_construction.h"
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include "goyo_db_if.h"
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoDeleteConstruction
 * @brief constructor
 */
GoyoDeleteConstruction::GoyoDeleteConstruction() {}

/**
 * @fn
 * ~GoyoDeleteConstruction
 * @brief destructor
 */
GoyoDeleteConstruction::~GoyoDeleteConstruction() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 */
Json GoyoDeleteConstruction::ExecuteCommand(Json &request, string &raw) {
  auto data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    auto message = L"not found GoyoAppDataDirectory " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  auto j_construction_id = request["args"]["constructionId"];
  auto j_delete_flag = request["args"]["deleteDirectory"];
  // validate arguments
  if (j_construction_id.is_null() || !j_construction_id.is_number()) {
    string message = "'args.constructionId' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }

  auto delete_flag = true;
  if (!j_delete_flag.is_null() && j_delete_flag.is_bool()) {
    delete_flag = j_delete_flag.bool_value();
  }

  // delete directory
  auto construction_id = j_construction_id.int_value();
  try {
    auto work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(data_dir, work_dir);
    auto construction_info =  master_db.GetConstructionInfo(construction_id);
    if (construction_info.GetConstructionId() == -1)
      return this->CreateErrorResponse(request, kErrorIOStr, "not found construction");
    master_db.DeleteConstruction(construction_info, delete_flag);
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (std::exception) {
    return this->CreateErrorResponse(request, kErrorIOStr,
                                     "failed to delete construction");
  }
  Json response = Json::object{{"constructionId", construction_id}};
  return Json::object{{"request", request}, {"response", response}};
}

}  // namespace goyo_bookrack_accessor
