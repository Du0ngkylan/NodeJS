/**
 * @file import_school.cc
 * @brief import school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/import_school.h"
#include "util/sms_app_util.h"
#include <command/school/get_school_detail.h>
#include <boost/date_time/local_time/custom_time_zone.hpp>
#include <boost/date_time/posix_time/ptime.hpp>


using namespace std;
using namespace json11;
using namespace db_manager;

namespace fs = boost::filesystem;
namespace pt = boost::property_tree;


namespace sms_accessor {

	/**
	* @fn
	* CreateProgramSettings
	* @brief create program settings
	* @param settings
	* @param j_settings
	* @param key
	*/
	inline void CreateSettings(model::album::SmsAlbumSettings &settings,
		const Json &j_settings, string &key) {
		switch (j_settings.type()) {
		case Json::Type::OBJECT: {
			auto j_obj = j_settings.object_items();
			for (auto &it : j_obj) {
				auto origin_str_key = key;
				if (key.empty()) {
					key = it.first;
				}
				else {
					key += "." + it.first;
				}
				CreateSettings(settings, it.second, key);
				key = origin_str_key;
			}
			break;
		}
		case Json::Type::NUMBER: {
			model::SmsValue vl(j_settings.int_value());
			settings.PutValue(key, vl);
			break;
		}
		case Json::Type::STRING: {
			model::SmsValue vl(j_settings.string_value());
			settings.PutValue(key, vl);
			break;
		}
		case Json::Type::BOOL: {
			model::SmsValue vl(j_settings.bool_value());
			settings.PutValue(key, vl);
			break;
		}
		case Json::NUL:
			break;
		case Json::ARRAY:
			break;
		default:
			break;
		}
	}


	inline void GetAlbumInBoockrackItemTree(
		vector<SmsBookrackItem> &bookrack_items,
		vector<SmsBookrackItem> &album_item) {
		for (auto &bookrack_item : bookrack_items) {
			if (bookrack_item.GetBookrackItemType() == 3) {
				album_item.push_back(bookrack_item);
				continue;
			}
			auto child_items = bookrack_item.GetChildBookrackItems();
			GetAlbumInBoockrackItemTree(child_items, album_item);
		}
	}

	/**
	 * @fn
	 * SmsImportSchool
	 * @brief constructor
	 */
	SmsImportSchool::SmsImportSchool() {
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
 * ~SmsImportSchool
 * @brief destructor
 */
SmsImportSchool::~SmsImportSchool() {}

/**
 * @fn
 * ExecuteCommand
 * @brief execute command
 * @param request request json
 * @param raw raw string
 * @return result json
 */
Json SmsImportSchool::ExecuteCommand(Json &request, string &raw) {
	auto data_dir = this->GetSmsAppDataDirectory();
	if (!ExistsFile(data_dir)) {
		const auto message = L"not found SmsAppDataDirectory" + data_dir;
		return this->CreateErrorResponse(request, kErrorIOStr, message);
	}

	const auto work_dir = this->GetSmsWorkDirectory();
	manager::SmsMasterDatabase master_db(data_dir, work_dir);

	try {

		Json response = Json::object{ {"constructionId", 1} };
		return Json::object{ {"request", request}, {"response", response} };
	} catch (SmsDatabaseException &ex) {
		return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
	} catch (SmsException &ex) {
		return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
	} catch (fs::filesystem_error) {
		const string message = "Import construction fail";
		return this->CreateErrorResponse(request, kErrorInternalStr, message);
	}
}

}  // namespace sms_accessor

