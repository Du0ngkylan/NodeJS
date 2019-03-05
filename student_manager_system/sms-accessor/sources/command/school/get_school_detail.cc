/**
 * @file get_construction_detail.cc
 * @brief get construction detail command implementation
 * @author duong.maixuan
 * @date 2018/07/18
 */

#include "command/construction/get_construction_detail.h"
#include <windows.h>
#include <boost/filesystem.hpp>
#include <boost/foreach.hpp>
#include <boost/property_tree/xml_parser.hpp>
#include "util/goyo_app_util.h"

using namespace std;
using namespace json11;
using namespace goyo_db_manager;
using namespace boost::property_tree;

namespace fs = boost::filesystem;

namespace goyo_bookrack_accessor {

const wstring KOUJI_XML = L"\\KOUJI.XML";
const wstring ROOT_ATTR_NAME = L"工事情報";

/**
 * @fn
 * GoyoGetConstructionDetail
 * @brief constructor
 */
GoyoGetConstructionDetail::GoyoGetConstructionDetail() {}

/**
 * @fn
 * ~GoyoGetConstructionDetail
 * @brief destructor
 */
GoyoGetConstructionDetail::~GoyoGetConstructionDetail() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param (request) request json 
 * @param (raw) raw string
 */
Json GoyoGetConstructionDetail::ExecuteCommand(Json &request,
                                               string &raw) {
  wstring data_dir = this->GetGoyoAppDataDirectory();
  if (!this->ExistsFile(data_dir)) {
    wstring message = L"Not found " + data_dir;
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorIOStr, message);
  }

  if (request["args"]["constructionId"].is_null() ||
      !request["args"]["constructionId"].is_number()) {
    string message = "'args.constructionId' is not specified";
    GoyoErrorLog(message);
    return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
  }
  bool get_folder_size = true;
  if (!request["args"]["getFolderSize"].is_null() ||
      request["args"]["getFolderSize"].is_bool()) {
    get_folder_size = request["args"]["getFolderSize"].bool_value();
  }

  int construction_id = request["args"]["constructionId"].int_value();
  Json::object response = Json::object();
  try {
    wstring work_dir = this->GetGoyoWorkDirectory();
    manager::GoyoMasterDatabase master_db(data_dir, work_dir);
    GoyoConstructionInfo construction_info = master_db.GetConstructionInfoDetail(construction_id);
    if (construction_info.GetConstructionId() == 0) {
      wstring message = L"Not found construction - " + to_wstring(construction_id);
      GoyoErrorLog(message);
      return this->CreateErrorResponse(request, kErrorIOStr, message);
    }
    Json construction = this->CreateConstruction(construction_info, master_db, get_folder_size);
    response.insert(pair<string,
                          Json>("construction", construction));
  } catch (GoyoDatabaseException &ex) {
    GoyoErrorLog(ex.What());
    return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
  } catch (GoyoException &ex) {
    GoyoErrorLog(ex.what());
    return this->CreateErrorResponse(request,
                                      kErrorInternalStr, ex.what());
  }
  return Json::object { {"request", request }, {"response", response } };
}

/**
 * @fn
 * CreateConstruction
 * @param (info) construction info
 * @param (db) construction database
 * @param (get_folder_size) get folder size flag
 * @brief create construction detail
 * @return construction object
 */
Json GoyoGetConstructionDetail::CreateConstruction(
    model::GoyoConstructionInfo &info, manager::GoyoMasterDatabase &db, bool get_folder_size) {
  // read construction(kouji) information
  wstring construction_dir =
      info.GetDataFolder();
  wstring kouji_xml = construction_dir + KOUJI_XML;
  unsigned long long ext_data_dir_size = 0;

  try {
    // have kouji.xml?
    if (!ExistsFile(kouji_xml)) {
      wstring message = L"Not found " + kouji_xml;
      throw GoyoException(message, __FILE__, __FUNCTION__, __LINE__);
    }

    if (get_folder_size) {
      ext_data_dir_size = GoyoAppUtil::GetTotalDirectorySize(construction_dir);
    }
    wptree construction_info = ReadUnicodeXML(kouji_xml);

    // get knack
    Json knack = CreateKnack(info.GetKnackInfo(), db);

    // get contractor
    model::GoyoContractorInfo contractor_info = info.GetContractorInfo();
    Json::object contractor = Json::object{
      { "contractorId", contractor_info.GetContractorId() },
      { "contractorCode", contractor_info.GetContractorCode() },
      { "contractorName", contractor_info.GetContractorName() },
    };

    // get contractee
    model::GoyoContracteeInfo contractee_info = info.GetContracteeInfo();
    Json::object contractee = Json::object{
      { "contracteeId", contractee_info.GetContracteeId() },
      { "contracteeCode", contractee_info.GetContracteeCode() },
      { "contracteeName", contractee_info.GetContracteeName() },
      { "largeCategory", contractee_info.GetLargeCategory() },
      { "middleCategory", contractee_info.GetMiddleCategory() },
      { "smallCategory", contractee_info.GetSmallCategory() }
    };

    string d_type = GoyoAppUtil::GetDriveTypeString(info.GetDataFolder());
    Json::object construction = Json::object{
      { "constructionId", info.GetConstructionId() },
      { "displayNumber", info.GetDisplayNumber() },
      { "constructionNumber", info.GetConstructionNumber() },
      { "constructionName", info.GetConstructionName() },
      { "startDate", info.GetStartDate() },
      { "endDate", info.GetEndDate() },
      { "dataFolder", ConvertWstring(info.GetDataFolder()) },
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

    // details ---------------------------------------------------------------
    construction.insert(pair<string,
                        Json>("dataFolderSize", to_string(ext_data_dir_size)));
    Json::array addresses = CreateAddresses(construction_info);
    construction.insert(pair<string, Json>("addresses", addresses));

    Json::array method_forms =
            CreateConstructionMethodForms(construction_info);
    construction.insert(pair<string,
                        Json>("constructionMethodForms", method_forms));

    Json::array business_codes =
                        CreateBusinessCode(construction_info);
    construction.insert(pair<string,
                        Json>("businessCodes", business_codes));

    Json::array business_keywords =
                  CreateBusinessKeyword(construction_info);
    construction.insert(pair<string,
                        Json>("businessKeywords", business_keywords));

    Json::array photo_information_tags =
                CreatePhotoInformationTag(construction_info);
    if (photo_information_tags.data() != NULL) {
    construction.insert(pair<string,
                        Json>("photoInformationTags", photo_information_tags));
    }

    Json::array facility_names =
                          CreateFacilityNames(construction_info);
    if (facility_names.data() != NULL) {
    construction.insert(pair<string,
                        Json>("facilityNames", facility_names));
    }

    vector<wstring> nm_keys = {
      L".工事内容", L".業務概要", L".測地系",
      L".工事実績システム登録番号", L".工事実績システムバージョン番号",
      L".業務実績システム登録番号", L".業務実績システムバージョン番号",
      L".工事分野", L".工事業種", L".日本語入力",
      L".西側境界座標経度", L".東側境界座標経度", L".北側境界座標緯度",
      L".南側境界座標緯度", L".予備", L".契約番号", L".主な業務の内容",
      L".施工金額", L".工事日付", L".GUID",
      L".起点側測点-n", L".起点側測点-m", L".終点側測点-n", L".終点側測点-m",
      L".起点側距離標-n", L".起点側距離標-m", L".終点側距離標-n", L".終点側距離標-m",
    };
    vector<string> fields = {
      "constructionContents", "constructionContents", "geodetic",
      "constructionSystemNumber", "constructionSystemVersionNumber",
      "constructionSystemNumber", "constructionSystemVersionNumber",
      "constructionField", "constructionIndustry", "inputJP",
      "westLongitude", "eastLongitude", "northLatitude", "sourthLatitude",
      "reserve", "contractNumber", "mainBusinessContents",
      "constructionAmount", "createDate", "guId",
      "stationStartN", "stationStartM", "stationEndN", "stationEndM",
      "distanceStartN", "distanceStartM", "distanceEndN", "distanceEndM",
    };

    int i = 0;
    for (auto itr = nm_keys.begin(); itr != nm_keys.end(); ++itr) {
      if (boost::optional<wstring> v =
          construction_info.get_optional<wstring>(ROOT_ATTR_NAME + *itr)) {
        string field = fields.at(i);
        string value = ConvertWstring(v);
        construction.insert(pair<string, string>(field, value));
      }
      i++;
    }

    Json::array water_routes =
              CreateWaterRouteInformations(construction_info);
    construction.insert(pair<string,
                        Json>("waterRouteInformations", water_routes));
    return construction;
  } catch (GoyoException &ex) {
    throw ex;
  } catch (xml_parser_error& ex) {
    throw ex;
  }
}

/**
 * @fn
 * CreateKnack
 * @param (knack_info) knack info
 * @param (db) construction database
 * @return nack object
 */
Json GoyoGetConstructionDetail::CreateKnack(
  model::GoyoKnackInfo &knack_info, manager::GoyoMasterDatabase &db) {
  try {
    GoyoStatement statement(db.GetMasterDb(),
      u8"SELECT knackId, knackName, knackType from knack WHERE knackId = ?;");
    statement.Bind(1, knack_info.GetKnackId());
    string name = "";
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

/**
 * @fn
 * CreateAddresses
 * @param (construction_info) construction property
 * @return address array
 */
Json::array GoyoGetConstructionDetail::CreateAddresses(
                                  wptree construction_info) {
  Json::array addresses = Json::array();
  wstring address_tag = L"住所情報タグ";
  BOOST_FOREACH(const wptree::value_type &child_tree,
           construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found address element
    if (tree_balise == address_tag) {
      wstring code = L"";
      if (boost::optional<wstring> c =
          child_tree.second.get_optional<wstring>(L"住所コード")) {
        code = c.get();
      }
      wstring address = L"";
      if (boost::optional<wstring> a =
          child_tree.second.get_optional<wstring>(L"住所")) {
        address = a.get();
      }

      addresses.push_back(Json::object{
        { "addressCode", ConvertWstring(code) },
        { "address", ConvertWstring(address) }
      });
    }
  }
  return addresses;
}

/**
 * @fn
 * CreateBusinessCode
 * @param (construction_info) construction property
 * @brief create business_code array
 * @return business_code array
 */
Json::array GoyoGetConstructionDetail::CreateBusinessCode(
                                        wptree construction_info) {
  Json::array business_codes = Json::array();
  wstring business_code_tag = L"業務分野CODE";
  BOOST_FOREACH(const wptree::value_type &child_tree,
    construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found business_code element
    if (tree_balise == business_code_tag) {
      string code = "";
      if (boost::optional<wstring> c =
          child_tree.second.get_optional<wstring>(L"業務分野コード")) {
        code = ConvertWstring(c);
      }
      business_codes.push_back(code);
    }
  }
  return business_codes;
}

/**
 * @fn
 * CreateBusinessKeyword
 * @param (construction_info) construction property
 * @brief create business_keywords array
 * @return business_keywords array
 */
Json::array GoyoGetConstructionDetail::CreateBusinessKeyword(
                            wptree construction_info) {
  Json::array business_keywords = Json::array();
  wstring business_keyword_tag = L"業務分野KEYWORD";
  BOOST_FOREACH(const wptree::value_type &child_tree,
    construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found business_keyword element
    if (tree_balise == business_keyword_tag) {
      string keyword = "";
      if (boost::optional<wstring> c =
          child_tree.second.get_optional<wstring>(L"業務分野キーワード名")) {
        keyword = ConvertWstring(c);
      }
      business_keywords.push_back(keyword);
    }
  }
  return business_keywords;
}

/**
 * @fn
 * CreateFacilityNames
 * @param (construction_info) construction property
 * @brief create facility_names array
 * @return facility_names array
 */
Json::array GoyoGetConstructionDetail::CreateFacilityNames(
                            wptree construction_info) {
  Json::array facility_names = Json::array();
  wstring facility_names_tag = L"施設情報";
  BOOST_FOREACH(const wptree::value_type &child_tree,
    construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found facility_names element
    if (tree_balise == facility_names_tag) {
      string facilityName = "";
      if (boost::optional<wstring> c =
          child_tree.second.get_optional<wstring>(L"施設名称")) {
        facilityName = ConvertWstring(c);
      }
      facility_names.push_back(facilityName);
    }
  }
  return facility_names;
}

/**
 * @fn
 * CreatePhotoInformationTag
 * @param (construction_info) construction property
 * @brief create photo_information_tags array
 * @return photo_information_tags array
 */
Json::array GoyoGetConstructionDetail::CreatePhotoInformationTag(
                            wptree construction_info) {
  Json::array photo_information_tags = Json::array();
  Json::array null = Json::array();
  wstring root_photo_information_tag = L"写真情報TAG";
  wstring photo_information_tag_tag = L"写真情報TAG名称";

  try {
    BOOST_FOREACH(const wptree::value_type &child_tree,
      construction_info.get_child(root_photo_information_tag)) {
      wstring tree_balise = child_tree.first;

      // found photoInformation element
      if (tree_balise == photo_information_tag_tag) {
        string photoInformationName = "";
        auto child_data = child_tree.second.data();
        photoInformationName = ConvertWstring(child_data);
        photo_information_tags.push_back(photoInformationName);
      }
    }
  } catch (xml_parser_error& e) {
    GoyoErrorLog(e.what());
    return photo_information_tags = null;
  } catch (ptree_bad_path& e) {
    // there are cases that do not exist
    GoyoDebugLog(e.what());
    return photo_information_tags = null;
  }
  return photo_information_tags;
}

/**
 * @fn
 * CreateConstructionMethodForms
 * @param (construction_info) construction property
 * @return address array
 */
Json::array GoyoGetConstructionDetail::CreateConstructionMethodForms(
                                        wptree construction_info) {
  Json::array method_forms = Json::array();
  wstring method_form_tag = L"工種・工法型式情報";
  BOOST_FOREACH(const wptree::value_type &child_tree,
    construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found address element
    if (tree_balise == method_form_tag) {
      string type = "";
      if (boost::optional<wstring> t =
                child_tree.second.get_optional<wstring>(L"工種")) {
        type = ConvertWstring(t);
      }
      string method = "";
      if (boost::optional<wstring> m =
            child_tree.second.get_optional<wstring>(L"工法型式")) {
        method = ConvertWstring(m);
      }
      method_forms.push_back(Json::object{
        { "constructionType", type }, { "constructionMethodForm", method },
      });
    }
  }
  return method_forms;
}

/**
 * @fn
 * CreateWaterRouteInformations
 * @param (construction_info) construction property
 * @brief create water route information array
 * @return water route information array
 */
Json::array GoyoGetConstructionDetail::CreateWaterRouteInformations(
                                      wptree construction_info) {
  Json::array water_routes = Json::array();
  BOOST_FOREACH(const wptree::value_type &child_tree,
    construction_info.get_child(ROOT_ATTR_NAME)) {
    wstring tree_balise = child_tree.first;

    // found water route element
    if (tree_balise == L"水系‐路線情報") {
      Json::object route_info = Json::object();

      // route children
      Json::array codes = Json::array();
      Json::array lines = Json::array();
      Json::array distances = Json::array();

      auto sub_tree = child_tree.second;
      BOOST_FOREACH(const wptree::value_type &child_vt, sub_tree) {
        wstring sub_key = child_vt.first;

        if (sub_key == L"対象水系路線名") {
          string name = ConvertWstring(
                        child_vt.second.get_value<wstring>());
          route_info.insert(pair<string,
                            Json>("waterRouteName", name));
        } else if (sub_key == L"路線水系名等") {
          string name = ConvertWstring(
                                      child_vt.second.get_value<wstring>());
          route_info.insert(pair<string, Json>("routeName", name));
        } else if (sub_key == L"対象水系路線コード") {
          string code = ConvertWstring(
                                      child_vt.second.get_value<wstring>());
          route_info.insert(pair<string,
                            Json>("waterRouteCode", code));
        } else if (sub_key == L"現道-旧道区分") {
          string section = ConvertWstring(
                                      child_vt.second.get_value<wstring>());
          route_info.insert(pair<string,
                            Json>("routeSection", section));
        } else if (sub_key == L"対象河川コード") {
          string code = ConvertWstring(
                                      child_vt.second.get_value<wstring>());
          codes.push_back(code);
        } else if (sub_key == L"左右岸上下線コード") {
          string line = ConvertWstring(
                                      child_vt.second.get_value<wstring>());
          lines.push_back(line);
        } else if (sub_key == L"測点距離標情報") {
          Json::object distance_meter = Json::object();
          if (boost::optional<wstring> s =
              child_vt.second.get_optional<wstring>(L"測点距離標区分")) {
            string section = ConvertWstring(s);
            distance_meter.insert(pair<string,
                          Json>("distanceMeterSection", section));
          }

          vector<wstring> nm_keys = {
            L"p起点側測点-n", L"p起点側測点-m", L"p終点側測点-n",
            L"p終点側測点-m", L"p起点側距離標-n", L"p起点側距離標-m",
            L"p終点側距離標-n", L"p終点側距離標-m",
          };
          vector<string> fields = {
            "pStationStartN", "pStationStartM", "pStationEndN",
            "pStationEndM", "pDistanceStartN", "pDistanceStartM",
            "pDistanceEndN", "pDistanceEndM",
          };

          int i = 0;
          for (auto itr = nm_keys.begin(); itr != nm_keys.end(); ++itr) {
            if (auto n = child_vt.second.get_optional<wstring>(*itr)) {
              string field = fields.at(i);
              string key = ConvertWstring(n);
              distance_meter.insert(pair<string, Json>(field, key));
            }
            i++;
          }
          distances.push_back(distance_meter);
        }
      }
      route_info.insert(pair<string, Json>("riverCodes", codes));
      route_info.insert(pair<string, Json>("lineCodes", lines));
      route_info.insert(pair<string, Json>("distanceMeters", distances));
      water_routes.push_back(route_info);
    }
  }
  return water_routes;
}

}  // namespace goyo_bookrack_accessor
