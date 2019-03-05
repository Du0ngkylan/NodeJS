/**
 * @file update_school_order.cc
 * @brief update school order command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <boost/filesystem.hpp>
#include "command/construction/update_school_order.h"
#include "sms_db_if.h"

using namespace std;
using namespace json11;
using namespace sms_db_manager;

namespace pt = boost::property_tree;
namespace sms_accessor {

/**
 * @fn
 * SmsUpdateSchoolOrder
 * @brief constructor
 */
SmsUpdateSchoolOrder::SmsUpdateSchoolOrder() {
  m_data_dir = this->GetSmsAppDataDirectory();
}

/**
 * @fn
 * ~SmsUpdateSchoolOrder
 * @brief destructor
 */
SmsUpdateSchoolOrder::~SmsUpdateSchoolOrder() = default;

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 */
Json SmsUpdateSchoolOrder::ExecuteCommand(Json& request, string& raw) {
  // validate arguments
  auto& j_school = request["args"]["schools"];
  if (j_school.is_null() || !j_school.is_array()) {
    const string message = "'args.schools' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  map<int, int> schools;
  for (auto& it : j_school.array_items()) {
    auto schoolId = GetIntFJson(it["schoolId"]);
    auto displayNumber = GetIntFJson(it["displayNumber"]);
    schools[schoolId] = displayNumber;
  }
  try {
    const auto workingDir = GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(m_data_dir, workingDir);
    auto count = master_db.UpdateDisplayNumberSchool(schools);
    Json response = Json::object{{"updateCount", count}};
    return Json::object{{"request", request}, {"response", response}};
  } catch (SmsException& ex) {
    return this->CreateErrorResponse(request, kErrorIOStr, ex.what());
  } catch (SmsDatabaseException& ex) {
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.what());
  }
}

int SmsUpdateSchoolOrder::UpdateSchool(const Json& school) {
  model::SmsSchoolInfo schoolInfo{};
  GetSchoolInfo(schoolInfo, school);

  const auto workingDir = GetSmsWorkDirectory();
  try {
    manager::SmsMasterDatabase master_db(m_data_dir, workingDir);

    SmsStatement statement(master_db.GetmasterDB(),
                            u8"SELECT displayNumber FROM "
                            u8"schools WHERE schoolId = ?;");
    statement.Bind(1, schoolInfo.GetSchoolId());
    auto displayNumberUpdate = 0;
    if (statement.ExecuteStep()) {
      displayNumberUpdate = statement.GetColumn(0).GetInt();
    }
    if (displayNumberUpdate != schoolInfo.GetDisplayNumber()) {
      master_db.UpdateSchool(schoolInfo);
      return 1;
    }
    return 0;
  } catch (SmsDatabaseException& ex) {
    throw SmsException(ex.What());
  }
}

void SmsUpdateSchoolOrder::GetSchoolInfo(
    model::SmsSchoolInfo& info, const Json& j_school) {
  try {
    if (!j_school.is_null()) {
      info.SetConstructionId(GetIntFJson(j_school["schoolId"]));

      // dataFolder
      auto& dataFolderJson = j_school["dataFolder"];
      auto dataFolder = GetWStringFJson(dataFolderJson);
      info.SetDataFolder(dataFolder);

      // displayNumber
      auto& displayNumberJson = j_school["displayNumber"];
      info.SetDisplayNumber(GetIntFJson(displayNumberJson));
    } else {
      throw SmsException("data school json invalid");
    }
  } catch (SmsException& ex) {
    SmsErrorLog(ex.What());
    throw SmsException(ex.What());
  }
}

}  // namespace sms_accessor
