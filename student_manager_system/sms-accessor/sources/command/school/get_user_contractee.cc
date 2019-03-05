/**
* @file get_user_contractee.cc
* @brief get user contractee command implementation
* @author duong.maixuan
* @date 2018/07/18
*/

#include "command/construction/get_user_contractee.h"
#include <boost/filesystem.hpp>

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

/**
 * @fn
 * GoyoGetUserContractee
 * @brief constructor
 */
GoyoGetUserContractee::GoyoGetUserContractee() {}

/**
 * @fn
 * ~GoyoGetUserContractee
 * @brief destructor
 */
GoyoGetUserContractee::~GoyoGetUserContractee() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json
 * @param (raw) raw string
 * @return result json
 */
Json GoyoGetUserContractee::ExecuteCommand(Json &request, string &raw) {
  wstring data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }
  Json contractees;
  try {
    auto contractee_codes = Json::array();
    auto contractee_names = Json::array();
    auto large_categorys = Json::array();
    auto middle_categorys = Json::array();
    auto smalle_categorys = Json::array();
    wstring work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_database(data_dir, work_dir);
    vector<model::GoyoContracteeInfo> out_contractee_infos;
    master_database.GetContractee(out_contractee_infos);
    // contractee_names
    for (auto &contractee_info : out_contractee_infos) {
       contractee_names.push_back(contractee_info.GetContracteeName());
    }
    auto it = unique(contractee_names.begin(), contractee_names.end());
    contractee_names.erase(it, contractee_names.end());

    // contractee_codes
    sort(out_contractee_infos.begin(), out_contractee_infos.end(),
      [](const model::GoyoContracteeInfo &info1,
        const model::GoyoContracteeInfo &info2) -> bool {
      return (info1.GetContracteeCode().compare(
        info2.GetContracteeCode()) < 0);
    });
    for (auto &contractee_info : out_contractee_infos) {
      contractee_codes.push_back(contractee_info.GetContracteeCode());
    }
    auto it1 = unique(contractee_codes.begin(), contractee_codes.end());
    contractee_codes.erase(it1, contractee_codes.end());

    // large_categorys
    sort(out_contractee_infos.begin(), out_contractee_infos.end(),
      [](const model::GoyoContracteeInfo &info1,
        const model::GoyoContracteeInfo &info2) -> bool {
      return (info1.GetLargeCategory().compare(
        info2.GetLargeCategory()) < 0);
    });
    for (auto &contractee_info : out_contractee_infos) {
      large_categorys.push_back(contractee_info.GetLargeCategory());
    }
    auto it2 = unique(large_categorys.begin(), large_categorys.end());
    large_categorys.erase(it2, large_categorys.end());

    // middle_categorys
    sort(out_contractee_infos.begin(), out_contractee_infos.end(),
      [](const model::GoyoContracteeInfo &info1,
        const model::GoyoContracteeInfo &info2) -> bool {
      return (info1.GetMiddleCategory().compare(
        info2.GetMiddleCategory()) < 0);
    });
    for (auto &contractee_info : out_contractee_infos) {
      middle_categorys.push_back(contractee_info.GetMiddleCategory());
    }
    auto it3 = unique(middle_categorys.begin(), middle_categorys.end());
    middle_categorys.erase(it3, middle_categorys.end());

    // smalle_categorys
    sort(out_contractee_infos.begin(), out_contractee_infos.end(),
      [](const model::GoyoContracteeInfo &info1,
        const model::GoyoContracteeInfo &info2) -> bool {
      return (info1.GetSmallCategory().compare(
        info2.GetSmallCategory()) < 0);
    });
    for (auto &contractee_info : out_contractee_infos) {
      smalle_categorys.push_back(contractee_info.GetSmallCategory());
    }
    auto it4 = unique(smalle_categorys.begin(), smalle_categorys.end());
    smalle_categorys.erase(it4, smalle_categorys.end());

    contractees = Json::object{ { "contracteeCodes", contractee_codes },
                                { "contracteeNames", contractee_names },
                                { "largeCategorys", large_categorys } ,
                                { "middleCategorys", middle_categorys },
                                { "smalleCategorys", smalle_categorys }};
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (GoyoException &ex) {
    GoyoErrorLog(ex.what());
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
  }
  return Json::object{{ "request", request }, { "response", contractees }};
}

}  // namespace goyo_bookrack_accessor

