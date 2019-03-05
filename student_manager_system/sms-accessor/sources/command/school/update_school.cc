/**
 * @file update_school.cc
 * @brief update school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include <boost/filesystem.hpp>
#include "command/school/update_school.h"
#include "sms_db_if.h"

using namespace std;
using namespace json11;
using namespace sms_db_manager;

namespace fs = boost::filesystem;
namespace pt = boost::property_tree;

namespace sms_accessor {


/**
 * @fn
 * SmsUpdateSchool
 * @brief constructor
 */
SmsUpdateSchool::SmsUpdateSchool() {}

/**
 * @fn
 * ~SmsUpdateSchool
 * @brief destructor
 */
SmsUpdateSchool::~SmsUpdateSchool() = default;

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw string of request
 */
Json SmsUpdateSchool::ExecuteCommand(Json& request, string& raw) {
  wstring data_dir = this->GetSmsAppDataDirectory();
  if (!ExistsFile(data_dir)) {
    auto message = L"Not found SmsAppDataDirectory " + data_dir;
    SmsErrorLog(message);
    return CreateErrorResponse(request, kErrorIOStr, message);
  }

  const auto& construction = request["args"]["school"];
  if (construction.is_null() || !construction.is_object()) {
    const string message = "'args.school' is not specified";
    SmsErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  model::SmsConstructionInfo construction_info{};
	try {
    GetConstructionInfo(construction_info, construction);
	}
	catch (SmsException& ex) {
		return this->CreateErrorResponse(request,	kErrorInvalidCommandStr, ex.What());
	}

  try {
    const auto working_dir = this->GetSmsWorkDirectory();
    manager::SmsMasterDatabase master_db(data_dir, working_dir);
    try {
      master_db.BeginTransaction();
      if (construction_info.GetConstructionId()) {
        master_db.UpdateConstruction(construction_info);
        CreateFileKouji(construction_info, construction);
        master_db.Commit();
        Json response = Json::object{
            {"constructionId", construction_info.GetConstructionId()}};
        return Json::object{{"request", request}, {"response", response}};
      }
      auto new_construction_id =
          master_db.CreateConstruction(construction_info);
      CreateFileKouji(construction_info, construction);
      master_db.Commit();
      Json response = Json::object{{"constructionId", new_construction_id}};
      return Json::object{{"request", request}, {"response", response}};
    } catch (SmsException& ex) {
      master_db.Rollback();
			return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
    }
  } catch (SmsDatabaseException& ex) {
    return this->CreateErrorResponse(request, kErrorInternalStr, ex.What());
  }
}

/**
 * @fn
 * CreateFileKouji
 * @brief Create new File kouji.XML
 * @param info model of construction
 * @param construction json data input
 */
int SmsUpdateSchool::CreateFileKouji(model::SmsConstructionInfo& info,
                                            const Json& construction) {
  auto knack_info = info.GetKnackInfo();
  if (knack_info.GetKnackId() == 0)
    throw SmsException("KnackInfo is not specified");
  auto knack_type = to_wstring(knack_info.GetKnackType());
  auto knack_id = to_wstring(knack_info.GetKnackId());
  const auto& file_name =
      knack_type.append(L"_").append(knack_id).append(L"_kouji.XML");
  auto working_dir = this->GetSmsWorkDirectory();
  const fs::wpath kouji_xml_org(
      working_dir.append(L"\\xml\\").append(file_name));
  if (!fs::exists(kouji_xml_org)) {
    auto message = file_name + L" not found Kouji template file";
    SmsDebugLog(message);
    throw SmsException(message);
  }

  auto w_kouji_file = info.GetDataFolder() + L"\\kouji.XML";
  auto w_temp_kouji = info.GetDataFolder() + L"\\kouji.XML______tmp";
  const fs::wpath kouji_path(w_kouji_file);
  const fs::wpath tmp_kouji(w_temp_kouji);
  if (ExistsFile(w_kouji_file)) {
    copy_file(kouji_path, tmp_kouji, fs::copy_option::overwrite_if_exists);
  }
  copy_file(kouji_xml_org, kouji_path, fs::copy_option::overwrite_if_exists);
  auto pt_kouji = ReadUnicodeXML(w_kouji_file);
  UpdateDataKoujiXml(construction, pt_kouji);
  try {
    WriteUnicodeXML(w_kouji_file, pt_kouji);
    ReadUnicodeXML(w_kouji_file);
  } catch(...) {
    if (ExistsFile(w_kouji_file)) {
      fs::remove(kouji_path);
    }
    if (ExistsFile(w_temp_kouji)) {
      fs::rename(tmp_kouji, kouji_path);
    }
    throw SmsException("failed to write xml");
  }
  if (ExistsFile(w_temp_kouji)) {
    fs::remove(tmp_kouji);
  }
  return 0;
}

/**
 * @fn
 * GetConstructionInfo
 * @brief Get info of construction form json
 * @param info model of construction
 * @param construction json data input
 */
void SmsUpdateSchool::GetConstructionInfo(
    model::SmsConstructionInfo& info, const Json& construction) {
  try {
    auto& construction_id_json = construction["constructionId"];
    if (!construction_id_json.is_null()) {
      info.SetConstructionId(GetIntFJson(construction_id_json));
    } else {
      throw SmsException("'args constructionId' is not specified");
    }
    // knack
    auto& knack_json = construction["knack"];
    if (!knack_json.is_null()) {
      SmsDebugLog("Get data knack");
      auto& j_knack_id = knack_json["knackId"];
      const auto knack_id = GetIntFJson(j_knack_id);
      auto& j_knack_name = knack_json["knackName"];
      auto& knack_name = GetStringFJson(j_knack_name);
      auto& j_knack_type = knack_json["knackType"];
      const auto knack_type = GetIntFJson(j_knack_type);
      model::SmsKnackInfo knack_info(knack_id, knack_name, knack_type);
      info.SetKnackInfo(knack_info);
    }
    info.SetCloudStrage(0);

    // contractee
    auto& j_contractee = construction["contractee"];
    if (!j_contractee.is_null()) {
      SmsDebugLog("Get data contractee");
      auto& j_contractee_code = j_contractee["contracteeCode"];
      auto& contractee_code = GetStringFJson(j_contractee_code);
      auto& j_contractee_name = j_contractee["contracteeName"];
      auto& contractee_name = GetStringFJson(j_contractee_name);
      string large_category, middle_category, small_category;
      auto& j_large_category = j_contractee["largeCategory"];
      if (!j_large_category.is_null()) {
        large_category = GetStringFJson(j_large_category);
      }
      auto& j_middle_category = j_contractee["middleCategory"];
      if (!j_middle_category.is_null()) {
        middle_category = GetStringFJson(j_middle_category);
      }
      auto& j_small_category = j_contractee["smallCategory"];
      if (!j_small_category.is_null()) {
        small_category = GetStringFJson(j_small_category);
      }
      auto j_contractee_id = j_contractee["contracteeId"];
      auto contractee_id = GetIntFJson(j_contractee_id);
      SmsContracteeInfo contractee_info(contractee_id, contractee_code,
                                         contractee_name, large_category,
                                         middle_category, small_category);
      info.SetContracteeInfo(contractee_info);
    }
    // contractor
    auto& contractor_json = construction["contractor"];
    if (!contractor_json.is_null()) {
      SmsDebugLog("Get data contractor");
      auto& j_contractor_code = contractor_json["contractorCode"];
      auto contractor_code = GetStringFJson(j_contractor_code);
      auto& j_contractor_name = contractor_json["contractorName"];
      auto contractor_name = GetStringFJson(j_contractor_name);
      auto j_contractor_id = contractor_json["contractorId"];
      auto contractor_id = GetIntFJson(j_contractor_id);
      SmsContractorInfo contractor_info(contractor_id, contractor_code,
                                         contractor_name);
      info.SetContractorInfo(contractor_info);
    }
    // dataFolder
    auto& j_data_folder = construction["dataFolder"];
    if (!j_data_folder.is_null()) {
      auto data_folder = GetWStringFJson(j_data_folder);
      info.SetDataFolder(data_folder);
    }
    // displayNumber
    auto& j_display_number = construction["displayNumber"];
    if (!j_display_number.is_null()) {
      info.SetDisplayNumber(GetIntFJson(j_display_number));
    }
    // isExternalFolder
    auto& j_is_external_folder = construction["isExternalFolder"];
    if (!j_is_external_folder.is_null()) {
      info.SetExternalFolder(GetBoolFJson(j_is_external_folder));
    }
    // isSharedFolder
    auto& j_is_shared_folder = construction["isSharedFolder"];
    if (!j_is_shared_folder.is_null()) {
      info.SetSharedFolder(GetBoolFJson(j_is_shared_folder));
    }
    // cloud Strage
    auto& j_cloud_strage = construction["cloudStorage"];
    if (!j_cloud_strage.is_null()) {
      info.SetCloudStrage(GetIntFJson(j_cloud_strage));
    }
    // constructionName
    auto& j_construction_name = construction["constructionName"];
    if (!j_construction_name.is_null()) {
      auto construction_name = GetStringFJson(j_construction_name);
      info.SetConstructionName(construction_name);
    }
    // startDate
    auto& j_start_date = construction["startDate"];
    if (!j_start_date.is_null()) {
      auto start_date = GetStringFJson(j_start_date);
      info.SetStartDate(start_date);
    }

    // endDate
    auto& j_end_date = construction["endDate"];
    if (!j_end_date.is_null()) {
      auto end_date = GetStringFJson(j_end_date);
      info.SetEndDate(end_date);
    }

    // constructionYear
    auto& j_year = construction["year"];
    if (!j_year.is_null()) {
      info.SetConstructionYear(GetIntFJson(j_year));
    } else {
      info.SetConstructionYear(0);
    }
    // constructionNumber
    auto& j_construction_number = construction["constructionNumber"];
    if (!j_construction_number.is_null()) {
      auto construction_number = GetStringFJson(j_construction_number);
      info.SetConstructionNumber(construction_number);
    }
  } catch (SmsException& ex) {
    SmsErrorLog(ex.What());
    throw SmsException(ex.What());
  }
}




}  // namespace sms_accessor
