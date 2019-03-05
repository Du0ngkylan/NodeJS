/**
 * @file get_user_contractor.cc
 * @brief get user contractor command implementation
 * @author le giap
 * @date 2018/07/25
 */

#include "command/construction/get_user_contractor.h"
#include <boost/filesystem.hpp>

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoGetUserContractor
 * @brief constructor
 */
GoyoGetUserContractor::GoyoGetUserContractor() {}

/**
 * @fn
 * ~GoyoGetUserContractor
 * @brief destructor
 */
GoyoGetUserContractor::~GoyoGetUserContractor() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 * @return result json
 */
Json GoyoGetUserContractor::ExecuteCommand(Json &request, string &raw) {
  wstring data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  try {
    Json::array contractor_names = Json::array();
    Json::array contractor_codes = Json::array();
    wstring work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase db(data_dir, work_dir);
    vector<model::GoyoContractorInfo> contractor_infos;
    db.GetContractor(contractor_infos);
    for (auto &contractor_info : contractor_infos) {
      contractor_names.push_back(contractor_info.GetContractorName());
    }
    auto it = unique(contractor_names.begin(), contractor_names.end());
    contractor_names.erase(it, contractor_names.end());
    sort(contractor_infos.begin(), contractor_infos.end(),
         [](const model::GoyoContractorInfo &contractor_info1,
            const model::GoyoContractorInfo &contractor_info2) -> bool {
           return (contractor_info1.GetContractorCode().compare(
                       contractor_info2.GetContractorCode()) < 0);
         });
    for (auto &contractor_info : contractor_infos) {
      contractor_codes.push_back(contractor_info.GetContractorCode());
    }
    auto it1 = unique(contractor_codes.begin(), contractor_codes.end());
    contractor_codes.erase(it1, contractor_codes.end());
    return Json::object{
        {"request", request},
        {"response", Json::object{{"contractorCodes", contractor_codes},
                                  {"contractorNames", contractor_names}}}};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (GoyoException &ex) {
    GoyoErrorLog(ex.what());
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
  }
}

}  // namespace goyo_bookrack_accessor
