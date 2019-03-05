/**
 * @file update_construction_order.cc
 * @brief update construction order command implementation
 * @author le giap
 * @date 2018/03/26
 */

#include <boost/filesystem.hpp>
#include "command/construction/update_construction.h"
#include "command/album/album_common.h"
#include "goyo_db_if.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;

namespace fs = boost::filesystem;
namespace pt = boost::property_tree;

namespace goyo_bookrack_accessor {


/**
 * @fn
 * GoyoUpdateConstruction
 * @brief constructor
 */
GoyoUpdateConstruction::GoyoUpdateConstruction() {
  m_data_dir = this->GetGoyoAppDataDirectory();
  // InitKey
  m_key_string[L"工事内容"] = "constructionContents";
  m_key_string[L"業務概要"] = "constructionContents";
  m_key_string[L"測地系"] = "geodetic";
  m_key_string[L"工事実績システム登録番号"] = "constructionSystemNumber";
  m_key_string[L"工事実績システムバージョン番号"] =
      "constructionSystemVersionNumber";
  m_key_string[L"業務実績システム登録番号"] = "constructionSystemNumber";
  m_key_string[L"業務実績システムバージョン番号"] =
      "constructionSystemVersionNumber";
  m_key_string[L"工事分野"] = "constructionField";
  m_key_string[L"工事業種"] = "constructionIndustry";
  m_key_string[L"日本語入力"] = "inputJP";
  m_key_string[L"予備"] = "reserve";
  m_key_string[L"施工金額"] = "constructionAmount";
  m_key_string[L"工事日付"] = "createDate";
  m_key_string[L"GUID"] = "guId";
  m_key_number[L"年度"] = "year";
  m_key_number[L"発注年度"] = "year";
  m_key_string[L"契約番号"] = "contractNumber";
  m_key_string[L"工事番号"] = "constructionNumber";
  m_key_string[L"設計書コード"] = "constructionNumber";
  m_key_string[L"しゅん功図書整理番号"] = "constructionNumber";
  m_key_string[L"業務名称"] = "constructionName";
  m_key_string[L"工事名称"] = "constructionName";
  m_key_string[L"施工金額"] = "constructionAmount";
  m_key_string[L"工事分野"] = "constructionField";
  m_key_string[L"工事業種"] = "constructionIndustry";
  m_key_string[L"工期開始日"] = "startDate";
  m_key_string[L"履行期間-着手"] = "startDate";
  m_key_string[L"工事内容"] = "constructionContents";
  m_key_string[L"業務概要"] = "constructionContents";
  m_key_contractee[L"発注者コード"] = "contracteeCode";
  m_key_contractee[L"発注者機関コード"] = "contracteeCode";
  m_key_contractee[L"発注者-大分類"] = "largeCategory";
  m_key_contractee[L"発注者-中分類"] = "middleCategory";
  m_key_contractee[L"発注者-小分類"] = "smallCategory";
  m_key_contractee[L"発注者機関事務所名"] = "contracteeName";
  m_key_contractee[L"発注者名称"] = "contracteeName";
  m_key_contractor[L"請負者名"] = "contractorName";
  m_key_contractor[L"受注者名"] = "contractorName";
  m_key_contractor[L"請負者コード"] = "contractorCode";
  m_key_contractor[L"受注者コード"] = "contractorCode";
  m_key_string[L"西側境界座標経度"] = "westLongitude";
  m_key_string[L"東側境界座標経度"] = "eastLongitude";
  m_key_string[L"北側境界座標緯度"] = "northLatitude";
  m_key_string[L"南側境界座標緯度"] = "sourthLatitude";
  m_key_string[L"起点側距離標-n"] = "distanceStartN";
  m_key_string[L"起点側距離標-m"] = "distanceStartM";
  m_key_string[L"終点側距離標-n"] = "distanceEndN";
  m_key_string[L"終点側距離標-m"] = "distanceEndM";
  m_key_string[L"起点側測点-n"] = "stationStartN";
  m_key_string[L"起点側測点-m"] = "stationStartM";
  m_key_string[L"終点側測点-n"] = "stationEndN";
  m_key_string[L"終点側測点-m"] = "stationEndM";
  m_key_string[L"工期終了日"] = "endDate";
  m_key_string[L"履行期間-完了"] = "endDate";
  m_key_string[L"主な業務の内容"] = "mainBusinessContents";
}

/**
 * @fn
 * ~GoyoUpdateConstruction
 * @brief destructor
 */
GoyoUpdateConstruction::~GoyoUpdateConstruction() = default;

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw string of request
 */
Json GoyoUpdateConstruction::ExecuteCommand(Json& request, string& raw) {
  m_data_dir = this->GetGoyoAppDataDirectory();
  if (!ExistsFile(m_data_dir)) {
    auto message = L"Not found GoyoAppDataDirectory " + m_data_dir;
    GoyoErrorLog(message);
    return CreateErrorResponse(request, kErrorIOStr, message);
  }

  const auto& construction = request["args"]["construction"];
  if (construction.is_null() || !construction.is_object()) {
    const string message = "'args.construction' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  model::GoyoConstructionInfo construction_info{};
	try {
    GetConstructionInfo(construction_info, construction);
	}
	catch (GoyoException& ex) {
		return this->CreateErrorResponse(request,	kErrorInvalidCommandStr, ex.What());
	}

  try {
    const auto working_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(m_data_dir, working_dir);
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
    } catch (GoyoException& ex) {
      master_db.Rollback();
			return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
    }
  } catch (GoyoDatabaseException& ex) {
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
int GoyoUpdateConstruction::CreateFileKouji(model::GoyoConstructionInfo& info,
                                            const Json& construction) {
  auto knack_info = info.GetKnackInfo();
  if (knack_info.GetKnackId() == 0)
    throw GoyoException("KnackInfo is not specified");
  auto knack_type = to_wstring(knack_info.GetKnackType());
  auto knack_id = to_wstring(knack_info.GetKnackId());
  const auto& file_name =
      knack_type.append(L"_").append(knack_id).append(L"_kouji.XML");
  auto working_dir = this->GetGoyoWorkDirectory();
  const fs::wpath kouji_xml_org(
      working_dir.append(L"\\xml\\").append(file_name));
  if (!fs::exists(kouji_xml_org)) {
    auto message = file_name + L" not found Kouji template file";
    GoyoDebugLog(message);
    throw GoyoException(message);
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
    throw GoyoException("failed to write xml");
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
void GoyoUpdateConstruction::GetConstructionInfo(
    model::GoyoConstructionInfo& info, const Json& construction) {
  try {
    auto& construction_id_json = construction["constructionId"];
    if (!construction_id_json.is_null()) {
      info.SetConstructionId(GetIntFJson(construction_id_json));
    } else {
      throw GoyoException("'args constructionId' is not specified");
    }
    // knack
    auto& knack_json = construction["knack"];
    if (!knack_json.is_null()) {
      GoyoDebugLog("Get data knack");
      auto& j_knack_id = knack_json["knackId"];
      const auto knack_id = GetIntFJson(j_knack_id);
      auto& j_knack_name = knack_json["knackName"];
      auto& knack_name = GetStringFJson(j_knack_name);
      auto& j_knack_type = knack_json["knackType"];
      const auto knack_type = GetIntFJson(j_knack_type);
      model::GoyoKnackInfo knack_info(knack_id, knack_name, knack_type);
      info.SetKnackInfo(knack_info);
    }
    info.SetCloudStrage(0);

    // contractee
    auto& j_contractee = construction["contractee"];
    if (!j_contractee.is_null()) {
      GoyoDebugLog("Get data contractee");
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
      GoyoContracteeInfo contractee_info(contractee_id, contractee_code,
                                         contractee_name, large_category,
                                         middle_category, small_category);
      info.SetContracteeInfo(contractee_info);
    }
    // contractor
    auto& contractor_json = construction["contractor"];
    if (!contractor_json.is_null()) {
      GoyoDebugLog("Get data contractor");
      auto& j_contractor_code = contractor_json["contractorCode"];
      auto contractor_code = GetStringFJson(j_contractor_code);
      auto& j_contractor_name = contractor_json["contractorName"];
      auto contractor_name = GetStringFJson(j_contractor_name);
      auto j_contractor_id = contractor_json["contractorId"];
      auto contractor_id = GetIntFJson(j_contractor_id);
      GoyoContractorInfo contractor_info(contractor_id, contractor_code,
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
  } catch (GoyoException& ex) {
    GoyoErrorLog(ex.What());
    throw GoyoException(ex.What());
  }
}

/**
 * @fn
 * UpdateDataKoujiXml
 * @brief Update content file kouji.XML
 * @param construction json data input
 * @param dst data for file kouji.XML after update
 */
void GoyoUpdateConstruction::UpdateDataKoujiXml(const Json& construction,
                                                pt::wptree& dst) {
  try {
    auto& root = dst.get_child(ROOT_NAME);
    for (auto&& it : m_key_string) {
      // if path doesn't exist, put value
      auto key = root.get_optional<wstring>(it.first);
      GoyoDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
      if (key) {
        auto& json = construction[it.second];
        if (!json.is_null()) {
          auto v = Utf8ToUtf16(json.string_value());
          GoyoDebugLog(L"Value update: " + v);
          root.put(it.first, v);
        }
      }
    }

    for (auto&& it : m_key_number) {
      // if path doesn't exist, put value
      auto key = root.get_optional<int>(it.first);
      GoyoDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
      if (key) {
        auto& json = construction[it.second];
        if (!json.is_null()) {
          auto v = GetIntFJson(json);
          GoyoDebugLog("Value update: " + to_string(v));
          root.put(it.first, v);
        }
      }
    }

    wstring knack_id = L"電子納品基準案";
    GoyoDebugLog(L"Key " + knack_id);
    if (root.get_optional<int>(knack_id)) {
      auto& json = construction["knack"]["knackId"];
      if (!json.is_null()) {
        auto v = GetIntFJson(json);
        root.put(knack_id, v);
      }
    }
    GoyoDebugLog(L"Update contractee");
    for (auto&& it : m_key_contractee) {
      GoyoDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
      // if path doesn't exist, put value
      if (root.get_optional<wstring>(it.first)) {
        auto& json = construction["contractee"][it.second];
        if (!json.is_null()) {
          auto v = GetWStringFJson(json);
          root.put(it.first, v);
        }
      }
    }
    GoyoDebugLog(L"Update contractor");
    for (auto&& it : m_key_contractor) {
      GoyoDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
      // if path doesn't exist, put value
      if (root.get_child_optional(it.first)) {
        auto& json = construction["contractor"][it.second];
        if (!json.is_null()) {
          auto v = GetWStringFJson(json);
          root.put(it.first, v);
        }
      }
    }

    if (root.get_child_optional(BUSINESS_CODES_TAG)) {
      root.erase(BUSINESS_CODES_TAG);
      auto business_codes = construction["businessCodes"].array_items();
      pt::wptree pt_business_codes;
      for (auto& business_code : business_codes) {
        GoyoDebugLog(L"Key " + wstring(BUSINESS_CODES_SUB_TAG));
        if (!business_code.is_null()) {
          const auto& v = GetWStringFJson(business_code);
          pt_business_codes.put(BUSINESS_CODES_SUB_TAG, v);
          root.push_back(make_pair(BUSINESS_CODES_TAG, pt_business_codes));
        }
      }
    }

    if (root.get_child_optional(BUSINESS_KEYWORDS_TAG)) {
      root.erase(BUSINESS_KEYWORDS_TAG);
      auto business_keywords = construction["businessKeywords"].array_items();
      pt::wptree pt_business_keywords;
      for (auto& business_keyword : business_keywords) {
        GoyoDebugLog(L"Key " + wstring(BUSINESS_KEYWORDS_SUB_TAG));
        if (!business_keyword.is_null()) {
          const auto& v = GetWStringFJson(business_keyword);
          pt_business_keywords.put(BUSINESS_KEYWORDS_SUB_TAG, (v));
          root.push_back(
              make_pair(BUSINESS_KEYWORDS_TAG, pt_business_keywords));
        }
      }
    }

    // nexco 場所情報
    if (root.get_child_optional(LOCATION_TYPE_TAG)) {
      auto& json = construction["locationType"];
      if (!json.is_null() && json.is_number()) {
        auto v = GetIntFJson(json);
        root.put(LOCATION_TYPE_TAG, v);

        switch (v) {
          case LOCATION_STATION:
            root.erase(DISTANCE_START_N_TAG);
            root.erase(DISTANCE_START_M_TAG);
            root.erase(DISTANCE_END_N_TAG);
            root.erase(DISTANCE_END_M_TAG);
            root.erase(COORDINATE_N_TAG);
            root.erase(COORDINATE_S_TAG);
            root.erase(COORDINATE_W_TAG);
            root.erase(COORDINATE_E_TAG);
            break;
          case LOCATION_DISTANCE:
            root.erase(STATION_START_N_TAG);
            root.erase(STATION_START_M_TAG);
            root.erase(STATION_END_N_TAG);
            root.erase(STATION_END_M_TAG);
            root.erase(COORDINATE_N_TAG);
            root.erase(COORDINATE_S_TAG);
            root.erase(COORDINATE_W_TAG);
            root.erase(COORDINATE_E_TAG);
            break;
          case LOCATION_COORDINATE:
            root.erase(STATION_START_N_TAG);
            root.erase(STATION_START_M_TAG);
            root.erase(STATION_END_N_TAG);
            root.erase(STATION_END_M_TAG);
            root.erase(DISTANCE_START_N_TAG);
            root.erase(DISTANCE_START_M_TAG);
            root.erase(DISTANCE_END_N_TAG);
            root.erase(DISTANCE_END_M_TAG);
            break;
          default:
            break;
        }
      }
    }

    // Update 施設情報.施設名称 - facilityNames;
    if (root.get_child_optional(FACILITY_NAMES_TAG)) {
      root.erase(FACILITY_NAMES_TAG);
      auto facility_names = construction["facilityNames"].array_items();
      GoyoDebugLog(L"Key: " + FACILITY_NAMES_TAG + L" - facilityNames");
      pt::wptree pt_facility_names;
      for (auto&& facility_name : facility_names) {
        if (!facility_name.is_null()) {
          const auto& v = GetWStringFJson(facility_name);
          pt_facility_names.put(FACILITY_NAMES_SUB_TAG, v);
          root.push_back(make_pair(FACILITY_NAMES_TAG, pt_facility_names));
        }
      }
    }

    // Update 住所情報タグ - addresses
    GoyoDebugLog(L"Update addresses");
    if (root.get_child_optional(ADDRESSES_TAG)) {
      root.erase(ADDRESSES_TAG);
      auto addresses = construction["addresses"].array_items();
      GoyoDebugLog(L"Key: " + ADDRESSES_TAG + L" - addresses");
      pt::wptree pt_addresses;
      for (auto&& item : addresses) {
        auto& address_json = item["address"];
        auto address = GetWStringFJson(address_json);
        pt_addresses.put(ADDRESS_TAG, address);
        auto& address_code_json = item["addressCode"];
        auto address_code = GetWStringFJson(address_code_json);
        pt_addresses.put(ADDRESS_CODE_TAG, address_code);
        root.push_back(make_pair(ADDRESSES_TAG, pt_addresses));
      }
    }

    // Update 工種・工法型式情報 - constructionMethodForms
    GoyoDebugLog(L"key: " + CONSTRUCTION_METHOD_FORMS_TAG +
                 L" -  constructionMethodForms");
    if (root.get_child_optional(CONSTRUCTION_METHOD_FORMS_TAG)) {
      root.erase(CONSTRUCTION_METHOD_FORMS_TAG);
      auto construction_method_forms =
          construction["constructionMethodForms"].array_items();
      for (auto&& method_form : construction_method_forms) {
        pt::wptree pt_method_forms;
        auto& j_construction_type = method_form["constructionType"];
        if (!j_construction_type.is_null()) {
          auto construction_type = GetWStringFJson(j_construction_type);
          pt_method_forms.put(CONSTRUCTION_TYPE_TAG, construction_type);
        }
        auto& j_method_form = method_form["constructionMethodForm"];
        if (!j_method_form.is_null()) {
          auto v_method_form = GetWStringFJson(j_method_form);
          pt_method_forms.put(CONSTRUCTION_METHOD_FORM_TAG, v_method_form);
        }
        root.push_back(
            make_pair(CONSTRUCTION_METHOD_FORMS_TAG, pt_method_forms));
      }
    }
    // Update WaterRouteInformations
    UpdateWaterRouteInformations(construction, dst);

    GoyoDebugLog(L"Update photoInformationTags");
    if (dst.count(ROOT_PHOTO_INFO_TAG) == 1) {
      GoyoDebugLog(L"key: " + ROOT_PHOTO_INFO_TAG +
        L" -  photoInformationTags");
      dst.erase(ROOT_PHOTO_INFO_TAG);

      pt::wptree pt_tags;
      int size = PHOTO_INFO_TAGS_ARRAY_LENGTH;
      if (construction["photoInformationTags"].is_array()) {
        auto tags = construction["photoInformationTags"].array_items();

        size = size - tags.size();
        for (auto& tag : tags) {
          auto v = GetWStringFJson(tag);
          GoyoDebugLog(L"v=" + v);
          pt_tags.add(PHOTO_INFO_TAG, v);
        }
      }

      for (int i = 0; i < size; i++)
        pt_tags.put(PHOTO_INFO_TAG, L"");

      dst.push_back(
        make_pair(ROOT_PHOTO_INFO_TAG, pt_tags));
    }
  } catch (boost::property_tree::ptree_error& e) {
    const auto message = "Set data for KOUJI.XML fail - " + string(e.what());
    GoyoErrorLog(message);
    throw GoyoException(message);
  } catch (GoyoException& ex) {
    const auto message = "Set data for KOUJI.XML fail - " + string(ex.what());
    GoyoErrorLog(message);
    throw GoyoException(message);
  }
}

/**
 * @fn
 * UpdateDataKoujiXml
 * @brief Update part WaterRouteInformations of kouji.XML
 * @param construction json data input
 * @param dst data for file kouji.XML after update
 */
void GoyoUpdateConstruction::UpdateWaterRouteInformations(
    const json11::Json& construction, boost::property_tree::wptree& dst) {
  auto& root = dst.get_child(ROOT_NAME);
  GoyoDebugLog(L"Update WaterRouteInformations");
  if (root.get_child_optional(WATER_ROUTE_INFORMATIONS_TAG)) {
    root.erase(WATER_ROUTE_INFORMATIONS_TAG);
    auto water_route_informations =
        construction["waterRouteInformations"].array_items();
    pt::wptree pt_water_route_informations;
    for (auto&& item : water_route_informations) {
      const auto& distance_meters = item["distanceMeters"].array_items();
      pt::wptree pt_distance_meters;
      for (auto&& dis : distance_meters) {
        GoyoDebugLog(L"Key: :" + DISTANCE_METER_SECTION_TAG +
                     L" - WaterRouteInformations");
        auto& j_meter_section = dis["distanceMeterSection"];
        if (!j_meter_section.is_null()) {
          auto meter_section = Utf8ToUtf16(j_meter_section.string_value());
          pt_distance_meters.put(DISTANCE_METER_SECTION_TAG, meter_section);
        }
        GoyoDebugLog(L"key: " + P_STATION_START_N_TAG + L" - pStationStartN");
        auto& j_p_station_start_n = dis["pStationStartN"];
        if (!j_p_station_start_n.is_null()) {
          auto p_station_start_n =
              Utf8ToUtf16(j_p_station_start_n.string_value());
          pt_distance_meters.put(P_STATION_START_N_TAG, p_station_start_n);
        }
        GoyoDebugLog(L"key: " + P_STATION_START_M_TAG + L" - pStationStartM");
        auto& j_p_station_start_m = dis["pStationStartM"];
        if (!j_p_station_start_m.is_null()) {
          auto p_station_start_m =
              Utf8ToUtf16(j_p_station_start_m.string_value());
          pt_distance_meters.put(P_STATION_START_M_TAG, p_station_start_m);
        }

        GoyoDebugLog(L"key: " + P_STATION_END_N_TAG + L" - pStationEndN");
        auto& j_p_station_end_n = dis["pStationEndN"];
        if (!j_p_station_end_n.is_null()) {
          auto p_station_end_n = Utf8ToUtf16(j_p_station_end_n.string_value());
          pt_distance_meters.put(P_STATION_END_N_TAG, p_station_end_n);
        }
        GoyoDebugLog(L"key: " + P_STATION_END_M_TAG + L" - pStationEndM");
        auto& j_p_station_end_m = dis["pStationEndM"];
        if (!j_p_station_end_m.is_null()) {
          auto p_station_end_m = Utf8ToUtf16(j_p_station_end_m.string_value());
          pt_distance_meters.put(P_STATION_END_M_TAG, p_station_end_m);
        }
        GoyoDebugLog(L"key: " + P_DISTANCE_START_N_TAG + L" - pDistanceStartN");
        GoyoDebugLog(L"Update pDistanceStartN");
        auto& j_p_distance_start_n = dis["pDistanceStartN"];
        if (!j_p_distance_start_n.is_null()) {
          auto p_distance_start_n =
              Utf8ToUtf16(j_p_distance_start_n.string_value());
          pt_distance_meters.put(P_DISTANCE_START_N_TAG, p_distance_start_n);
        }
        GoyoDebugLog(L"key: " + P_DISTANCE_START_M_TAG + L" - pDistanceStartM");
        auto& j_p_distance_start_m = dis["pDistanceStartM"];
        if (!j_p_distance_start_m.is_null()) {
          auto p_distance_start_m =
              Utf8ToUtf16(j_p_distance_start_m.string_value());
          pt_distance_meters.put(P_DISTANCE_START_M_TAG, p_distance_start_m);
        }

        GoyoDebugLog(L"key: " + P_DISTANCE_END_N_TAG + L" - pDistanceEndN");
        auto& j_p_distance_end_n = dis["pDistanceEndN"];
        if (!j_p_distance_end_n.is_null()) {
          auto p_distance_end_n =
              Utf8ToUtf16(j_p_distance_end_n.string_value());
          pt_distance_meters.put(P_DISTANCE_END_N_TAG, p_distance_end_n);
        }
        GoyoDebugLog(L"key: " + P_DISTANCE_END_M_TAG + L" - pDistanceEndM");
        GoyoDebugLog(L"Update pDistanceEndM");
        auto& j_p_distance_end_m = dis["pDistanceEndM"];
        if (!j_p_distance_end_m.is_null()) {
          auto p_distance_end_m =
              Utf8ToUtf16(j_p_distance_end_m.string_value());
          pt_distance_meters.put(P_DISTANCE_END_M_TAG, p_distance_end_m);
        }
        pt_water_route_informations.push_back(
            make_pair(DISTANCE_METERS_TAG, pt_distance_meters));
        pt_distance_meters.clear();
      }
      GoyoDebugLog(L"key: " + WATER_ROUTE_NAME_TAG + L" - waterRouteName");
      auto& j_water_route_name = item["waterRouteName"];
      if (!j_water_route_name.is_null()) {
        auto water_route_name = Utf8ToUtf16(j_water_route_name.string_value());
        pt_water_route_informations.put(WATER_ROUTE_NAME_TAG, water_route_name);
      }
      GoyoDebugLog(L"key: " + WATER_ROUTE_CODE_TAG + L" - waterRouteCode");
      auto& j_water_route_code = item["waterRouteCode"];
      if (!j_water_route_code.is_null()) {
        auto water_route_code = Utf8ToUtf16(j_water_route_code.string_value());
        pt_water_route_informations.put(WATER_ROUTE_CODE_TAG, water_route_code);
      }
      GoyoDebugLog(L"key: " + ROUTE_SECTION_TAG + L" - routeSection");
      auto& j_route_section = item["routeSection"];
      if (!j_route_section.is_null()) {
        auto route_section = Utf8ToUtf16(j_route_section.string_value());
        pt_water_route_informations.put(ROUTE_SECTION_TAG, route_section);
      }
      GoyoDebugLog(L"key: " + ROUTE_NAME_TAG + L" - routeName");
      auto& j_route_name = item["routeName"];
      if (!j_route_name.is_null()) {
        auto route_name = Utf8ToUtf16(j_route_name.string_value());
        pt_water_route_informations.put(ROUTE_NAME_TAG, route_name);
      }
      GoyoDebugLog(L"key: " + RIVER_CODES_TAG + L" - riverCodes");
      auto river_codes = item["riverCodes"].array_items();
      for (auto&& river_code : river_codes) {
        const auto& v = Utf8ToUtf16(river_code.string_value());
        pt_water_route_informations.add(RIVER_CODES_TAG, v);
      }
      GoyoDebugLog(L"key: " + LINE_CODES_TAG + L" - lineCodes");
      auto line_codes = item["lineCodes"].array_items();
      for (auto&& line_code : line_codes) {
        const auto& v = Utf8ToUtf16(line_code.string_value());
        pt_water_route_informations.add(LINE_CODES_TAG, v);
      }
      root.push_back(
          make_pair(WATER_ROUTE_INFORMATIONS_TAG, pt_water_route_informations));
      pt_water_route_informations.clear();
    }
  }
}

}  // namespace goyo_bookrack_accessor
