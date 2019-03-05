/**
 * @file import_school.cc
 * @brief import school command implementation
 * @author DuongMX
 * @date 2018/11/30
 */

#include "command/school/import_school.h"
#include "util/Sms_app_util.h"
#include <command/school/get_school_detail.h>
#include <boost/date_time/local_time/custom_time_zone.hpp>
#include <boost/date_time/posix_time/ptime.hpp>


using namespace std;
using namespace json11;
using namespace sms_db_manager;

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

inline wstring GetNewDataFolderConstruction(wstring parent_data_dir) {
  for (auto i = 1; i < 100000; ++i) {
    auto new_construction_folder = L"construction" + std::to_wstring(i);
    const auto parent = fs::wpath(parent_data_dir) / new_construction_folder;
    if (!fs::exists(parent)) return new_construction_folder;
  }
  return {};
}



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
		auto j_data_folder = request["args"]["dataFolder"];
		if (j_data_folder.is_null() || !j_data_folder.is_string()) {
			const string message = "'args.dataFolder' is not specified";
			return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
		}
		auto src_data_folder = this->Utf8ToUtf16(j_data_folder.string_value());
		if (!ExistsFile(src_data_folder)) {
			const auto message = L"not found source import: " + src_data_folder;
			return this->CreateErrorResponse(request, kErrorIOStr, message);
		}
		auto is_external_folder = true;
		if (!request["args"]["isExternalFolder"].is_null()) {
			is_external_folder = request["args"]["isExternalFolder"].bool_value();
		}

		auto is_shared_folder = true;
		if (!request["args"]["isSharedFolder"].is_null()) {
			is_shared_folder = request["args"]["isSharedFolder"].bool_value();
		}

		auto cloud_strage = 0;
		if (!request["args"]["cloudStorage"].is_null() &&
			request["args"]["cloudStorage"].is_number()) {
			cloud_strage = request["args"]["cloudStorage"].int_value();
		}
    auto is_sample = false;
		if (!request["args"]["isSample"].is_null() &&
			request["args"]["isSample"].is_bool()) {
			is_sample = request["args"]["isSample"].bool_value();
		}

		const auto work_dir = this->GetSmsWorkDirectory();
		manager::SmsMasterDatabase master_db(data_dir, work_dir);
		master_db.BeginTransaction();

		try {
			const auto src_construction_db_path = fs::wpath(src_data_folder) / "constructionDB.db";
			if (!fs::exists(src_construction_db_path)) {
				const auto message = L"not found source database construction";
				return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
			}

			const auto src_kouji_path = fs::wpath(src_data_folder) / "KOUJI.XML";
			wstring w_kouji = src_kouji_path.wstring();
			if (!ExistsFile(w_kouji)) {
				const string message = "KOUJI.XML is not exits";
				return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
			}

			manager::SmsConstructionDatabase src_construction_db(src_data_folder, work_dir);
			auto construction_id = 0;
			try {
				auto src_construction_info = src_construction_db.GetConstructionInfo();

				SmsStatement statement(master_db.GetMasterDb(),
					"select * from construction where construction.dataFolder = ?");
				statement.Bind(1, ConvertWstring(src_data_folder));
				if (statement.ExecuteStep()) {
					const string message = "this construction is existed in database";
					return this->CreateErrorResponse(request, kErrorInvalidCommandStr, message);
				}

				src_construction_info.SetDataFolder(src_data_folder);
				src_construction_info.SetCloudStrage(cloud_strage);
				src_construction_info.SetExternalFolder(is_external_folder);
				src_construction_info.SetSharedFolder(is_shared_folder);
        src_construction_info.SetIsSample(is_sample);

				const auto j_src_construction_info =
					SmsGetConstructionDetail::CreateConstruction(src_construction_info, master_db, false);

				SmsConstructionInfo new_construction_info{};
				GetConstructionInfo(new_construction_info, j_src_construction_info);
				construction_id = master_db.CreateConstruction(new_construction_info, true);
                master_db.Commit();
			}
			catch (...) {
				master_db.Rollback();
				const string message = "create new construction fail";
				return this->CreateErrorResponse(request, kErrorIOStr, message);
			}

			Json response = Json::object{ {"constructionId", construction_id} };
			return Json::object{ {"request", request}, {"response", response} };
		}
		catch (SmsDatabaseException &ex) {
			master_db.Rollback();
			return this->CreateErrorResponse(request, kErrorIOStr, ex.What());
		}
		catch (SmsException &ex) {
			master_db.Rollback();
			return this->CreateErrorResponse(request, kErrorInvalidCommandStr, ex.What());
		}
		catch (fs::filesystem_error) {
			master_db.Rollback();
			const string message = "Import construction fail";
			return this->CreateErrorResponse(request, kErrorInternalStr, message);
		}
	}

	/**
	* @fn
	* CopyReferenceDiagramFile
	* @brief
	* @param j_ref_diagram_file
	* @return relative path Reference Diagram
	*/
	std::wstring SmsImportSchool::CopyReferenceDiagramFile(
		const Json &j_ref_diagram_file, wstring &album_dir) {
		auto ref_diagram_file = j_ref_diagram_file.string_value();

		if (ref_diagram_file.empty()) return {};
		auto w_ref_diagram_file = ConvertString(ref_diagram_file);
		fs::wpath from(w_ref_diagram_file);
		auto album_files = fs::wpath(album_dir) / FILES;
		auto file_name = from.filename().wstring();
		file_name = SmsAppUtil::GenerateUniqueFileNameInFolder(file_name,
			album_files.wstring());
		const auto to(album_files / file_name);
		copy_file(from, to);
		return L"files\\" + file_name;
	}

	void SmsImportSchool::AddAlbumFrames(
		vector<Json> &album_frames_json,
		manager::SmsAlbumDatabase &album_db,
		manager::SmsAlbumItemDatabase &album_item_db) {
		for (auto &j_album_frame : album_frames_json) {
			auto album = album_db.GetAlbum();
			const auto album_id = album.GetAlbumId();
			auto album_dir = album_db.GetParentFolderDb();

			auto album_frame_id = album_db.GetMaxItemId("albumFrameId", "albumFrame");
			auto display_number = album_db.GetMaxItemId("displayNumber", "albumFrame");
			auto photo_frame_id = album_db.GetMaxItemId("photoFrameId", "photoFrame");
			auto text_frame_id = album_db.GetMaxItemId("textFrameId", "textFrame");
			auto ref_diagram_id = album_db.GetMaxItemId("referenceDiagramId", "referenceDiagram");
			SmsAlbumFrame album_frame;
			album_frame.SetRecordStatus(RecordStatus::ADDED);
			album_frame.SetAlbumId(album_id);
			album_frame.SetAlbumFrameId(++album_frame_id);
			album_frame.SetDisplayNumber(++display_number);
			album_frame.SetReferenceSourceAlbumFrameId(0);

			auto &j_ref_diagram_file = j_album_frame["referenceDiagramFilePath"];
			if (!j_ref_diagram_file.is_null()) {
				auto ref_diagram_file_xls = CopyReferenceDiagramFile(j_ref_diagram_file, album_dir);
				album_frame.SetReferenceDiagramFilePath(ref_diagram_file_xls);
			}
			auto &j_ref_source_album_frame_id = j_album_frame["referenceSouceAlbumFrameId"];
			if (!j_ref_source_album_frame_id.is_null())
				album_frame.SetReferenceSourceAlbumFrameId(
					j_ref_source_album_frame_id.int_value());
			// Set PhotoFrames
			auto j_array_photo_frames = GetArrayFJson(j_album_frame["photoFrames"]);
			vector<SmsPhotoFrame> photo_frames;
			auto photo_display_number = 0;

			for (auto &j_photo_frame : j_array_photo_frames) {
				auto j_photo_frame_id = j_photo_frame["photoFrameId"];
				auto j_album_item_id = j_photo_frame["albumItemId"];
				SmsPhotoFrame photo_frame;
				photo_frame.SetRecordStatus(RecordStatus::ADDED);
				photo_frame.SetAlbumFrameId(album_frame_id);
				photo_frame.SetDisplayNumber(++photo_display_number);
				photo_frame.SetPhotoFrameId(++photo_frame_id);
				SmsAlbumItem album_item;
				album_item.SetRecordStatus(ADDED);
				album_item_db.GetCurrentAlbumItemPath();
				auto album_item_path = fs::wpath(album_dir).parent_path().parent_path()
					/ "albumItems"
					/ album_item_db.GetCurrentAlbumItemPath();
				auto album_item_dir = album_item_path.wstring();
				SmsDebugLog(album_item_path.wstring());

				SmsAddAlbumFrames::InsertAlbumItem(j_photo_frame,
					album_item_db,
					album_item,
					album_item_path.wstring());

				SmsUpdateAlbumFrames::SetUniqueAlbumAlias(
					j_photo_frame, photo_frame, album_item.GetFileName(), album_db);
				photo_frame.SetAlbumItemId(album_item.GetAlbumItemId());
				photo_frames.push_back(photo_frame);
			}
			album_frame.SetPhotoFrames(photo_frames);

			// Set TextFrame
			vector<SmsTextFrame> text_frames;
			auto &j_text_frames = j_album_frame["textFrames"];
			for (auto &pair_text_frame : j_text_frames.object_items()) {
				const auto key = pair_text_frame.first;
				if (!j_text_frames[key].is_null()) {
					auto value = pair_text_frame.second;
					SmsTextFrame text_frame;
					text_frame.SetRecordStatus(ADDED);
					text_frame.SetTextFrameId(++text_frame_id);
					text_frame.SetAlbumFrameId(album_frame.GetAlbumFrameId());
					SmsAddAlbumFrames::GetContentTextFrame(value, text_frame);
					text_frames.push_back(text_frame);
				}
			}
			album_frame.SetTextFrames(text_frames);

			// Set ConstructionPhotoInfo
			auto j_construction_photo = j_album_frame["constructionPhotoInformation"];
			if (!j_construction_photo.is_null()) {
				auto &photo_info_path = BuildConstructionPhotoPath(album_frame_id);
				album_frame.SetConstructionPhotoInfoPath(photo_info_path);
				auto j_photo_info_key = j_construction_photo[PHOTO_INFO_KEY];
				auto j_ref_key = j_construction_photo[REF_DIA_INFO_KEY];
				if (!j_photo_info_key.is_null()) {
					SmsAddAlbumFrames::UpdateConstructionPhotoInfo(
						album_dir,
						album_frame,
						j_construction_photo,
						album_frame_id,
						ref_diagram_id);
				}
				else if (!j_ref_key.is_null()) {
					auto j_ref = j_ref_key.object_items();

					string keys[] = { PHOTO_FILE_NAME };
					for (auto &key : keys) {
						if (!j_ref[key].is_null()) {
							auto org_name = j_ref[key].string_value();
							fs::wpath src(ConvertString(org_name));
							// when caller want to specify the file name of the reference diagram
							auto save_name = src.filename().wstring();
							j_ref[key] = ConvertWstring(save_name);
						}
					}
					auto ref_dia_path = BuildReferenceDiagramsPath(album_frame_id);
					SmsAddAlbumFrames::WriteAlbumFrameJsonFile(ref_dia_path, j_ref, REF_DIA_INFO_KEY);
				}
			}
			album_db.UpdateAlbumFrame(album_frame);
			album_db.SetFrontImageAndReducedImage(album);
			album.SetAlbumFrameTotalCount(album.GetAlbumFrameTotalCount() + 1);
			album_db.UpdateAlbum(album);
		}
	}


	/**
	* @fn
	* CreateAlbum
	* @brief
	* @param j_album
	* @param album_id
	* @param album_db
	*/
	void SmsImportSchool::CreateAlbum(const Json &j_album, int &album_id,
		manager::SmsAlbumDatabase &album_db) {
		auto album_path = album_db.GetParentFolderDb();

		try {
			SmsAlbum album;
			SetAlbum(album, j_album, RecordStatus::ADDED);
			album.SetAlbumFrameTotalCount(0);
			auto template_folder =
				fs::wpath(album_path) / "files" / album.GetAlbumTemplate();
			// Copy Album template
			auto &j_album_template = j_album["layout"]["albumTemplate"];

			if (!j_album_template.is_null()) {
				fs::wpath src_album_template = GetWStringFJson(j_album_template);
				// copy source album template
				if (!fs::exists(src_album_template) || src_album_template.empty())
					throw SmsException("folder album template invalid");
				CopyAlbumTemplate(src_album_template, template_folder);
			}
			// copy source cover file
			auto back_cover_path = GetWStringFJson(j_album["backCover"]);
			auto front_cover_path = GetWStringFJson(j_album["frontCover"]);
			auto spine_cover_path = GetWStringFJson(j_album["spineCover"]);

			vector<fs::wpath> src_covers;
			for (const auto& src : { back_cover_path, front_cover_path,spine_cover_path }) {
				if (fs::exists(src)) {
					src_covers.emplace_back(src);
				}
				else {
					throw SmsException(L"source file cover error: " + src);
				}
			}
			CopyCoverFiles(src_covers, fs::wpath(album_path));
			album_db.CreateAlbum(album);
			album_db.UpdateAlbumSettings(album.GetAlbumSettings());
		}
		catch (...) {
			if (fs::exists(album_path)) fs::remove_all(album_path);
		}
	}


	void SmsImportSchool::GetContractee(const Json& j_contractee, SmsContracteeInfo& contractee_info)
	{
		SmsDebugLog("Get data contractee");
		auto& j_contractee_code = j_contractee["contracteeCode"];
		auto contractee_code = j_contractee_code.string_value();
		auto& j_contractee_name = j_contractee["contracteeName"];
		auto contractee_name = j_contractee_name.string_value();
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
		const auto contractee_id = j_contractee_id.int_value();
		contractee_info = SmsContracteeInfo(contractee_id, contractee_code,
			contractee_name, large_category,
			middle_category, small_category);
	}

	void SmsImportSchool::GetContractor(const Json& contractor_json, SmsContractorInfo& contractor_info)
	{
		SmsDebugLog("Get data contractor");
		auto& j_contractor_code = contractor_json["contractorCode"];
		auto contractor_code = GetStringFJson(j_contractor_code);
		auto& j_contractor_name = contractor_json["contractorName"];
		auto contractor_name = GetStringFJson(j_contractor_name);
		auto& j_contractor_id = contractor_json["contractorId"];
		const auto contractor_id = j_contractor_id.int_value();
		contractor_info = SmsContractorInfo(contractor_id,
			contractor_code,
			contractor_name);
	}

	/**
	* @fn
	* GetConstructionInfo
	* @brief Get info of construction form json
	* @param info model of construction
	* @param construction json data input
	*/
	void SmsImportSchool::GetConstructionInfo(
		model::SmsConstructionInfo& info, const Json& construction) {
		try {
			auto& construction_id_json = construction["constructionId"];
			if (!construction_id_json.is_null()) {
				info.SetConstructionId(GetIntFJson(construction_id_json));
			}
			else {
				throw SmsException("'args constructionId' is not specified");
			}
            auto& is_sample_json = construction["isSample"];
            if (!is_sample_json.is_null()) {
              info.SetIsSample(is_sample_json.bool_value());
            }
			// knack
			auto& knack_json = construction["knack"];
			if (!knack_json.is_null()) {
				SmsDebugLog("Get data knack");
				auto& j_knack_id = knack_json["knackId"];
				const auto knack_id = GetIntFJson(j_knack_id);
				auto& j_knack_name = knack_json["knackName"];
				auto knack_name = j_knack_name.string_value();
				auto& j_knack_type = knack_json["knackType"];
				const auto knack_type = GetIntFJson(j_knack_type);
				model::SmsKnackInfo knack_info(knack_id, knack_name, knack_type);
				info.SetKnackInfo(knack_info);
			}
			info.SetCloudStrage(0);

			// contractee
			auto& j_contractee = construction["contractee"];
			if (!j_contractee.is_null()) {
				SmsContracteeInfo contractee_info;
				GetContractee(j_contractee, contractee_info);
				info.SetContracteeInfo(contractee_info);
			}
			// contractor
			auto& contractor_json = construction["contractor"];
			if (!contractor_json.is_null()) {
				SmsContractorInfo contractor_info;
				GetContractor(contractor_json, contractor_info);
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
			// cloud Storage
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
			}
			else {
				info.SetConstructionYear(0);
			}
			// constructionNumber
			auto& j_construction_number = construction["constructionNumber"];
			if (!j_construction_number.is_null()) {
				auto construction_number = GetStringFJson(j_construction_number);
				info.SetConstructionNumber(construction_number);
			}
		}
		catch (SmsException& ex) {
			SmsErrorLog(ex.What());
			throw SmsException(ex.What());
		}
		catch (SmsDatabaseException& ex) {
			const auto message =
				ex.What() + string(" - error please check SmsDatabase");
			SmsErrorLog(message);
			throw SmsException(message);
		}
	}


	/**
	* @fn
	* CreateFileKouji
	* @brief Create new File kouji.XML
	* @param info model of construction
	* @param construction json data input
	*/
	int SmsImportSchool::CreateFileKouji(model::SmsConstructionInfo& info,
		const Json& construction) {
		try {
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
			const fs::wpath kouji_path(w_kouji_file);
			copy_file(kouji_xml_org, kouji_path, fs::copy_option::overwrite_if_exists);
			auto pt_kouji = ReadUnicodeXML(w_kouji_file);
			UpdateDataKoujiXml(construction, pt_kouji);
			WriteUnicodeXML(w_kouji_file, pt_kouji);
			return 0;
		}
		catch (SmsException &ex) {
			throw ex;
		}
		catch (fs::filesystem_error) {
			throw SmsException("filesystem_error create file KOUJI.XML fail");
		}

	}


	/**
	* @fn
	* UpdateDataKoujiXml
	* @brief Update content file kouji.XML
	* @param construction json data input
	* @param dst data for file kouji.XML after update
	*/
	void SmsImportSchool::UpdateDataKoujiXml(const Json& construction,
		pt::wptree& dst) {
		try {
			auto& root = dst.get_child(ROOT_NAME);
			for (auto&& it : m_key_string) {
				// if path doesn't exist, put value
				auto key = root.get_optional<wstring>(it.first);
				SmsDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
				if (key) {
					auto& json = construction[it.second];
					if (!json.is_null()) {
						auto v = Utf8ToUtf16(json.string_value());
						SmsDebugLog(L"Value update: " + v);
						root.put(it.first, v);
					}
				}
			}

			for (auto&& it : m_key_number) {
				// if path doesn't exist, put value
				auto key = root.get_optional<int>(it.first);
				SmsDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
				if (key) {
					auto& json = construction[it.second];
					if (!json.is_null()) {
						auto v = GetIntFJson(json);
						SmsDebugLog("Value update: " + to_string(v));
						root.put(it.first, v);
					}
				}
			}

			wstring knack_id = L"電子納品基準案";
			SmsDebugLog(L"Key " + knack_id);
			if (root.get_optional<int>(knack_id)) {
				auto& json = construction["knack"]["knackId"];
				if (!json.is_null()) {
					auto v = GetIntFJson(json);
					root.put(knack_id, v);
				}
			}
			SmsDebugLog(L"Update contractee");
			for (auto&& it : m_key_contractee) {
				SmsDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
				// if path doesn't exist, put value
				if (root.get_optional<wstring>(it.first)) {
					auto& json = construction["contractee"][it.second];
					if (!json.is_null()) {
						auto v = GetWStringFJson(json);
						root.put(it.first, v);
					}
				}
			}
			SmsDebugLog(L"Update contractor");
			for (auto&& it : m_key_contractor) {
				SmsDebugLog(L"Key " + it.first + L" -- " + Utf8ToUtf16(it.second));
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
					SmsDebugLog(L"Key " + wstring(BUSINESS_CODES_SUB_TAG));
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
					SmsDebugLog(L"Key " + wstring(BUSINESS_KEYWORDS_SUB_TAG));
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
				SmsDebugLog(L"Key: " + FACILITY_NAMES_TAG + L" - facilityNames");
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
			SmsDebugLog(L"Update addresses");
			if (root.get_child_optional(ADDRESSES_TAG)) {
				root.erase(ADDRESSES_TAG);
				auto addresses = construction["addresses"].array_items();
				SmsDebugLog(L"Key: " + ADDRESSES_TAG + L" - addresses");
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
			SmsDebugLog(L"key: " + CONSTRUCTION_METHOD_FORMS_TAG +
				L" -  constructionMethodForms");
			if (root.get_child_optional(CONSTRUCTION_METHOD_FORMS_TAG)) {
				root.erase(CONSTRUCTION_METHOD_FORMS_TAG);
				auto construction_method_forms =
					construction["constructionMethodForms"].array_items();
				pt::wptree pt_method_forms;
				for (auto&& method_form : construction_method_forms) {
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

			SmsDebugLog(L"Update photoInformationTags");
			if (dst.count(ROOT_PHOTO_INFO_TAG) == 1) {
				SmsDebugLog(L"key: " + ROOT_PHOTO_INFO_TAG +
					L" -  photoInformationTags");
				dst.erase(ROOT_PHOTO_INFO_TAG);

				pt::wptree pt_tags;
				int size = PHOTO_INFO_TAGS_ARRAY_LENGTH;
				if (construction["photoInformationTags"].is_array()) {
					auto tags = construction["photoInformationTags"].array_items();

					size = size - tags.size();
					for (auto& tag : tags) {
						auto v = GetWStringFJson(tag);
						SmsDebugLog(L"v=" + v);
						pt_tags.add(PHOTO_INFO_TAG, v);
					}
				}

				for (int i = 0; i < size; i++)
					pt_tags.put(PHOTO_INFO_TAG, L"");

				dst.push_back(
					make_pair(ROOT_PHOTO_INFO_TAG, pt_tags));
			}

		}
		catch (boost::property_tree::ptree_error& e) {
			const auto message = "Set data for KOUJI.XML fail - " + string(e.what());
			SmsErrorLog(message);
			throw SmsException(message);
		}
		catch (SmsException& ex) {
			const auto message = "Set data for KOUJI.XML fail - " + string(ex.what());
			SmsErrorLog(message);
			throw SmsException(message);
		}
	}


	/**
	* @fn
	* UpdateDataKoujiXml
	* @brief Update part WaterRouteInformations of kouji.XML
	* @param construction json data input
	* @param dst data for file kouji.XML after update
	*/
	void SmsImportSchool::UpdateWaterRouteInformations(
		const json11::Json& construction, boost::property_tree::wptree& dst) {
		auto& root = dst.get_child(ROOT_NAME);
		SmsDebugLog(L"Update WaterRouteInformations");
		if (root.get_child_optional(WATER_ROUTE_INFORMATIONS_TAG)) {
			root.erase(WATER_ROUTE_INFORMATIONS_TAG);
			auto water_route_informations =
				construction["waterRouteInformations"].array_items();
			pt::wptree pt_water_route_informations;
			for (auto&& item : water_route_informations) {
				const auto& distance_meters = item["distanceMeters"].array_items();
				pt::wptree pt_distance_meters;
				for (auto&& dis : distance_meters) {
					SmsDebugLog(L"Key: :" + DISTANCE_METER_SECTION_TAG +
						L" - WaterRouteInformations");
					auto& j_meter_section = dis["distanceMeterSection"];
					if (!j_meter_section.is_null()) {
						auto meter_section = Utf8ToUtf16(j_meter_section.string_value());
						pt_distance_meters.put(DISTANCE_METER_SECTION_TAG, meter_section);
					}
					SmsDebugLog(L"key: " + P_STATION_START_N_TAG + L" - pStationStartN");
					auto& j_p_station_start_n = dis["pStationStartN"];
					if (!j_p_station_start_n.is_null()) {
						auto p_station_start_n =
							Utf8ToUtf16(j_p_station_start_n.string_value());
						pt_distance_meters.put(P_STATION_START_N_TAG, p_station_start_n);
					}
					SmsDebugLog(L"key: " + P_STATION_START_M_TAG + L" - pStationStartM");
					auto& j_p_station_start_m = dis["pStationStartM"];
					if (!j_p_station_start_m.is_null()) {
						auto p_station_start_m =
							Utf8ToUtf16(j_p_station_start_m.string_value());
						pt_distance_meters.put(P_STATION_START_M_TAG, p_station_start_m);
					}

					SmsDebugLog(L"key: " + P_STATION_END_N_TAG + L" - pStationEndN");
					auto& j_p_station_end_n = dis["pStationEndN"];
					if (!j_p_station_end_n.is_null()) {
						auto p_station_end_n = Utf8ToUtf16(j_p_station_end_n.string_value());
						pt_distance_meters.put(P_STATION_END_N_TAG, p_station_end_n);
					}
					SmsDebugLog(L"key: " + P_STATION_END_M_TAG + L" - pStationEndM");
					auto& j_p_station_end_m = dis["pStationEndM"];
					if (!j_p_station_end_m.is_null()) {
						auto p_station_end_m = Utf8ToUtf16(j_p_station_end_m.string_value());
						pt_distance_meters.put(P_STATION_END_M_TAG, p_station_end_m);
					}
					SmsDebugLog(L"key: " + P_DISTANCE_START_N_TAG + L" - pDistanceStartN");
					SmsDebugLog(L"Update pDistanceStartN");
					auto& j_p_distance_start_n = dis["pDistanceStartN"];
					if (!j_p_distance_start_n.is_null()) {
						auto p_distance_start_n =
							Utf8ToUtf16(j_p_distance_start_n.string_value());
						pt_distance_meters.put(P_DISTANCE_START_N_TAG, p_distance_start_n);
					}
					SmsDebugLog(L"key: " + P_DISTANCE_START_M_TAG + L" - pDistanceStartM");
					auto& j_p_distance_start_m = dis["pDistanceStartM"];
					if (!j_p_distance_start_m.is_null()) {
						auto p_distance_start_m =
							Utf8ToUtf16(j_p_distance_start_m.string_value());
						pt_distance_meters.put(P_DISTANCE_START_M_TAG, p_distance_start_m);
					}

					SmsDebugLog(L"key: " + P_DISTANCE_END_N_TAG + L" - pDistanceEndN");
					auto& j_p_distance_end_n = dis["pDistanceEndN"];
					if (!j_p_distance_end_n.is_null()) {
						auto p_distance_end_n =
							Utf8ToUtf16(j_p_distance_end_n.string_value());
						pt_distance_meters.put(P_DISTANCE_END_N_TAG, p_distance_end_n);
					}
					SmsDebugLog(L"key: " + P_DISTANCE_END_M_TAG + L" - pDistanceEndM");
					SmsDebugLog(L"Update pDistanceEndM");
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
				SmsDebugLog(L"key: " + WATER_ROUTE_NAME_TAG + L" - waterRouteName");
				auto& j_water_route_name = item["waterRouteName"];
				if (!j_water_route_name.is_null()) {
					auto water_route_name = Utf8ToUtf16(j_water_route_name.string_value());
					pt_water_route_informations.put(WATER_ROUTE_NAME_TAG, water_route_name);
				}
				SmsDebugLog(L"key: " + WATER_ROUTE_CODE_TAG + L" - waterRouteCode");
				auto& j_water_route_code = item["waterRouteCode"];
				if (!j_water_route_code.is_null()) {
					auto water_route_code = Utf8ToUtf16(j_water_route_code.string_value());
					pt_water_route_informations.put(WATER_ROUTE_CODE_TAG, water_route_code);
				}
				SmsDebugLog(L"key: " + ROUTE_SECTION_TAG + L" - routeSection");
				auto& j_route_section = item["routeSection"];
				if (!j_route_section.is_null()) {
					auto route_section = Utf8ToUtf16(j_route_section.string_value());
					pt_water_route_informations.put(ROUTE_SECTION_TAG, route_section);
				}
				SmsDebugLog(L"key: " + ROUTE_NAME_TAG + L" - routeName");
				auto& j_route_name = item["routeName"];
				if (!j_route_name.is_null()) {
					auto route_name = Utf8ToUtf16(j_route_name.string_value());
					pt_water_route_informations.put(ROUTE_NAME_TAG, route_name);
				}
				SmsDebugLog(L"key: " + RIVER_CODES_TAG + L" - riverCodes");
				auto river_codes = item["riverCodes"].array_items();
				for (auto&& river_code : river_codes) {
					const auto& v = Utf8ToUtf16(river_code.string_value());
					pt_water_route_informations.add(RIVER_CODES_TAG, v);
				}
				SmsDebugLog(L"key: " + LINE_CODES_TAG + L" - lineCodes");
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




	/**
	* @fn
	* CopyAlbumData
	* @brief Copy data album Template
	* @param template_folder old folder
	* @param template_folder_org new folder
	*/
	void SmsImportSchool::CopyAlbumTemplate(fs::wpath &template_folder,
		fs::wpath &template_folder_org) {
		try {
			vector<fs::wpath> src_files;
			GetAllFile(template_folder, src_files);
			auto &to = template_folder_org;
			if (!exists(to)) create_directories(to);
			for (auto &from : src_files) {
				copy_file(from, to / from.filename(),
					fs::copy_option::overwrite_if_exists);
			}
		}
		catch (fs::filesystem_error) {
			throw SmsException("copy album template fail");
		}
	}


	/**
	* @fn
	* CopyCoverFiles
	* @brief  Copy Cover Files for album
	* @param album_json json input data
	* @param album_dir album folder
	*/
	void SmsImportSchool::CopyCoverFiles(vector<fs::wpath> &src_covers,
		fs::wpath &album_dir) {
		try {
			const auto album_files = album_dir / FILES;
			vector<fs::wpath> dst_covers = { album_files / FR_COVER,
																			 album_files / BK_COVER,
																			 album_files / SP_COVER };
			SmsDebugLog(L"copy cover files: " + album_files.wstring());

			if (!is_directory(album_files)) create_directories(album_files);
			for (auto i = 2; i >= 0; --i) {
				const auto from = src_covers.at(i);
				const auto to = dst_covers.at(i);
				if (!equivalent(from.parent_path(), album_files))
					copy_file(from, to, fs::copy_option::overwrite_if_exists);
			}
		}
		catch (...) {  // fs::filesystem_error
			throw SmsException("Copy Cover Files fail");
		}
	}

	void SmsImportSchool::GetAlbumSetting(SmsAlbum& album, const Json& settings) const {
		try {
			auto photo_information_icon = settings["photoInformationIcon"];
			if (!photo_information_icon.is_null()) {
				album.SetBookCoverSterIcon(photo_information_icon.int_value());
			}
			auto display_name_and_image = settings["displayNameAndImage"];
			if (!display_name_and_image.is_null()) {
				album.SetDisplayNameAndImage(display_name_and_image.int_value());
			}
			auto &book_cover_option = settings["bookCoverOption"];
			if (!book_cover_option.is_null()) {
				album.SetBookCoverColor(book_cover_option["bookCoverColorType"].int_value());
				album.SetBookCoverFontJson(book_cover_option["font"].dump());
				album.SetHorizontalName(
					book_cover_option["horizontalName"].int_value());
			}
			auto jpeg_quality = settings["reducedImage"]["jpegQuality"];
			if (!jpeg_quality.is_null()) {
				album.SetJpegQuality(jpeg_quality.int_value());
			}
			auto reduced_image_type = settings["reducedImage"]["reducedImageType"];
			if (!reduced_image_type.is_null()) {
				album.SetReducedImageType(reduced_image_type.int_value());
			}
			auto &password_hash = settings["passwordHash"];
			if (!password_hash.is_null()) {
				album.SetPasswordHash(string(password_hash.string_value()));
			}
			auto icon = settings["displayOption"]["icon"];
			if (!icon.is_null()) {
				album.SetIcon(icon.int_value());
			}
			auto thickness_by_page = settings["thicknessByPage"];
			if (!thickness_by_page.is_null()) {
				album.SetThicknessByPage(thickness_by_page.int_value());
			}
		}
		catch (...) {
			throw SmsException("get album setting fail");
		}
	}

	/**
	* @fn
	* SetAlbum
	* @brief Set data BookrackItem
	* @param album  SmsAlbum
	* @param j_album Json album input
	* @param status RecordStatus update or create
	* @throw no SmsException get data json
	*/
	void SmsImportSchool::SetAlbum(SmsAlbum &album, const Json &j_album,
		const RecordStatus status) const {
		try {
			// Only create
			auto &now = boost::posix_time::second_clock::local_time();
			auto &date = this->ConvertFormatDate(to_iso_string(now));

			const auto album_id = j_album["albumId"].int_value();
			album.SetAlbumId(album_id);
			album.SetBookrackItemId(album_id);

			auto &j_album_frame_total_count = j_album["albumFrameTotalCount"];
			auto album_frame_total_count = 0;
			if (!j_album_frame_total_count.is_null()) {
				album_frame_total_count = j_album_frame_total_count.int_value();
			}
			album.SetAlbumFrameTotalCount(album_frame_total_count);
			album.SetFrontImageAlbumId(0);
			album.SetReducedImageId(0);
			album.SetCreateDate(date);
			album.SetAlbumTemplate(ALBUM_TEMPLATE);
			album.SetUpdateDate(date);

			auto j_album_type = j_album["albumType"];
			auto album_type = 0;
			if (!j_album_type.is_null()) {
				album_type = j_album_type.int_value();
			}
			album.SetAlbumType(album_type);

			SmsAlbumSettings album_settings;
			album.SetBookCoverSterIcon(0);
			auto &settings = j_album["albumSettings"];
			if (!settings.is_null()) {
				GetAlbumSetting(album, settings);
				SetAlbumSetting(album_settings, settings);
			}
			album.SetAlbumSettings(album_settings);
		}
		catch (SmsException &ex) {
			throw ex;
		}
	}


	///**
	//* @fn
	//* SetBookrackItem
	//* @brief Set data BookrackItem
	//* @param item  SmsBookrackItem
	//* @param j_album Json album input
	//* @param status RecordStatus update or create
	//*/
	//void SmsImportSchool::SetBookrackItem(SmsBookrackItem &item,
	//	const Json &j_album) const {
	//	auto bookrack_item_name = j_album["albumSettings"]["albumName"];
	//	if (!bookrack_item_name.is_null())
	//		item.SetBookrackItemName(GetStringFJson(bookrack_item_name));
	//
	//	auto color_type =
	//		j_album["albumSettings"]["bookCoverOption"]["bookCoverColorType"];
	//	if (!color_type.is_null()) item.SetColorType(GetIntFJson(color_type));
	//
	//	auto &now = boost::posix_time::second_clock::local_time();
	//	auto &date = ConvertFormatDate(to_iso_string(now));
	//	item.SetUpdateDate(date);
	//	item.SetSpecialType(0);
	//	// Only create
	//	auto album_type = j_album["albumType"];
	//	if (album_type.is_null() && album_type.is_number())
	//		throw SmsException("albumType is not specified");
	//
	//	// drop album
	//	auto special_type = 0;
	//	if (album_type == ALBUM_TYPE_DROP)
	//		special_type = SPECIAL_TYPE_SYSTEM;
	//	item.SetSpecialType(special_type);
	//
	//	item.SetBookrackItemType(BOOKRACK_ITEM_TYPE_ALBUM);
	//
	//	auto j_display_number = j_album["displayNumber"];
	//	auto display_number = 0;
	//	if (j_display_number.is_null())
	//		display_number = j_display_number.int_value();
	//	item.SetDisplayNumber(display_number);
	//
	//	auto parent_bookrack_item_id = j_album["parentBookrackItemId"];
	//	if (parent_bookrack_item_id.is_null())
	//		throw SmsException("parentBookrackItemId is not specified");
	//	item.SetParentBookrackItem(parent_bookrack_item_id.int_value());
	//	item.SetCreateDate(date);
	//}


	/**
	* @fn
	* SetAlbumSetting
	* @brief get data for SmsAlbumSettings from json
	* @param settings SmsAlbumSettings
	* @param j_settings input json setting
	*/
	void SmsImportSchool::SetAlbumSetting(SmsAlbumSettings &settings,
		const Json &j_settings) const {
		CreateSettings(settings, j_settings, string());
	}



	Json SmsImportSchool::GetAlbumDetail(int album_id, manager::SmsAlbumDatabase &album_db,
		SmsBookrackItem &bookrack_item,
		manager::SmsAlbumItemDatabase &album_item_db) {
		auto album = album_db.GetAlbum();
		auto album_settings = album.GetAlbumSettings();

		pt::ptree pt_settings;
		GetSettingsTree(album_settings, pt_settings);

		Json::object j_settings;
		if (auto optional = pt_settings.get_child_optional("settings")) {
			auto child = optional.get();
			j_settings = GetDataAlbumSettings(child).object_items();
			// Problem #7732 ex albumName="001" -> json type number. so overwrite
			const auto &name = bookrack_item.GetBookrackItemName();
			j_settings["albumName"] = name;
		}
		if (auto &optional =
			pt_settings.get_child_optional("settings.bookCoverOption")) {
			auto &book_cover =
				GetBookCoverOption(optional.get(), album_db, album_item_db);
			j_settings["bookCoverOption"] = book_cover;
		}

		auto image_file_total_count = GetImageFileTotalCount(album_db);
		auto j_data_folder_info =
			Json::object{ { "imageFileTotalCount", image_file_total_count } };

		auto frame_total_count = GetFrameTotalCount(album_db);

		auto album_dir = ConvertWstring(album_db.GetParentFolderDb());
		Json j_layout = Json::object{
			{ "albumTemplate", album_dir + "\\" + FILES + "\\" + album.GetAlbumTemplate() } };
		Json album_detail =
			Json::object{ { "albumFolder", album_dir },
			{ "albumId", album_id },
			{ "albumType", album.GetAlbumType() },
			{ "albumSettings", j_settings },
			{ "frameTotalCount", frame_total_count },
			{ "spineCover", album_dir + SP_COVER_FILES },
			{ "frontCover", album_dir + FR_COVER_FILES },
			{ "backCover", album_dir + BK_COVER_FILES },
			{ "layout", j_layout },
			{ "dataFolderInformation", j_data_folder_info } };
		return album_detail;
	}

	/**
	* @fn
	* GetSettingsTree
	* @brief convert SmsAlbumSettings to tree structrue
	* @param settings SmsAlbumSettings input data
	* @param root out put
	*/
	void SmsImportSchool::GetSettingsTree(SmsAlbumSettings &settings,
		pt::ptree &root) const {
		std::vector<std::string> key_settings;
		settings.GetKeyList(key_settings);
		pt::ptree tmp;
		for (auto &key : key_settings) {
			SmsDebugLog(key);
			auto &v = settings.GetValue(key);
			auto data_type = v.GetDataType();
			SmsDebugLog(std::to_string(data_type));
			PutValueSetting(v, data_type, tmp, key);
		}
		root.add_child("settings", tmp);
	}


	/**
	* @fn
	* GetAlbumSettings
	* @brief create album settings
	* @param settings is a SmsAlbumSettings
	* @return album settings object
	*/
	Json SmsImportSchool::GetDataAlbumSettings(pt::ptree &settings) const {
		SmsDebugLog("Start GetDataAlbumSettings");
		try {
			Json::object j_album_settings;
			// Json j_sentence;
			SmsDebugLog("Get Sentence setting");
			if (auto optional = settings.get_child_optional("sentence")) {
				SmsDebugLog("Get font setting for sentence");
				auto &child = optional.get();
				Json j_font;
				if (auto op_font_binary = child.get_optional<string>("font.fontBinary")) {
					auto &font_binary = op_font_binary.get();
					auto win_font = LogFont(font_binary);
					j_font = CreateFont(win_font, "");
				}
				auto display_type = 0;
				if (auto op_display_type = child.get_optional<int>("displayType")) {
					display_type = op_display_type.get();
				}
				j_album_settings["sentence"] =
					Json::object{ { "displayType", display_type },{ "font", j_font } };
				SmsDebugLog("Out sentence setting");
			}

			SmsDebugLog("Get ClickType setting");
			if (auto optional = settings.get_optional<int>("clickType")) {
				j_album_settings["clickType"] = optional.get();
				SmsDebugLog("Out clickType setting");
			}

			if (auto op_display_option = settings.get_child_optional("displayOption")) {
				SmsDebugLog("Get DisplayOption setting");
				auto &child = op_display_option.get();
				Json::object j_display_option;
				if (auto optional = child.get_optional<int>("bookmarkOnIndexWindow")) {
					j_display_option["bookmarkOnIndexWindow"] = optional.get();
				}
				if (auto optional = child.get_optional<int>("focus")) {
					j_display_option["focus"] = optional.get();
				}
				if (auto optional = child.get_optional<int>("icon")) {
					j_display_option["icon"] = optional.get();
				}
				if (auto optional = child.get_optional<int>("pageNumber")) {
					j_display_option["pageNumber"] = optional.get();
				}
				if (auto optional = child.get_optional<int>("slider")) {
					j_display_option["slider"] = optional.get();
				}
				if (auto optional = child.get_optional<int>("turnOver")) {
					j_display_option["turnOver"] = optional.get();
				}
				j_album_settings["displayOption"] = j_display_option;
			}

			SmsDebugLog("PhotoInfoTemplate setting");
			if (auto op_photo_info = settings.get_child_optional("photoInfoTemplate")) {
				auto &child = op_photo_info.get();
				Json::object j_photo_info_temp;
				if (auto optional = child.get_optional<string>("largeClassification")) {
					j_photo_info_temp["largeClassification"] = optional.get();
				}
				if (auto optional = child.get_optional<string>("photoClassification")) {
					j_photo_info_temp["photoClassification"] = optional.get();
				}
				if (auto optional = child.get_optional<string>("constructionType")) {
					j_photo_info_temp["constructionType"] = optional.get();
				}
				if (auto optional = child.get_optional<string>("middleClassification")) {
					j_photo_info_temp["middleClassification"] = optional.get();
				}
				if (auto optional = child.get_optional<string>("smallClassification")) {
					j_photo_info_temp["smallClassification"] = optional.get();
				}
				j_album_settings["photoInfoTemplate"] = j_photo_info_temp;
			}

			SmsDebugLog("Get pagingDirection setting");
			if (auto optional = settings.get_optional<int>("pagingDirection")) {
				j_album_settings["pagingDirection"] = optional.get();
				SmsDebugLog("Out pagingDirection setting");
			}

			SmsDebugLog("Get reducedImage setting");
			if (auto op_reduced_image = settings.get_child_optional("reducedImage")) {
				auto &child = op_reduced_image.get();
				auto jpeg_quality = 0;
				if (auto optional = child.get_optional<int>("jpegQuality")) {
					jpeg_quality = optional.get();
				}
				auto reduced_image_type = 0;
				if (auto optional = child.get_optional<int>("reducedImageType")) {
					reduced_image_type = optional.get();
				}
				j_album_settings["reducedImage"] = Json::object{
					{ "jpegQuality", jpeg_quality },
					{ "reducedImageType", reduced_image_type },
				};
			}

			if (auto optional = settings.get_optional<int>("matDesign.matType")) {
				j_album_settings["matDesign"] = Json::object{ { "matType", optional.get() } };
				SmsDebugLog("Out matDesign setting");
			}

			SmsDebugLog("Get albumName setting");
			if (auto &optional = settings.get_optional<string>("albumName")) {
				j_album_settings["albumName"] = optional.get();
			}

			SmsDebugLog("Get passwordHash setting");
			if (auto &optional = settings.get_optional<string>("passwordHash")) {
				j_album_settings["passwordHash"] = optional.get();
			}
			SmsDebugLog("return from GetDataAlbumSettings");
			return Json(j_album_settings);
		}
		catch (const pt::ptree_error &ex) {
			SmsErrorLog(ex.what());
			throw SmsException("Parser setting data fail");
		}
	}


	/**
	*@fn
	* GetBookCoverOption
	* @brief get BookCoverOption setting
	* @param settings data of album setting
	* @param album_db is SmsAlbumDatabase
	* @param item_db is SmsAlbumItemDatabase
	* @return Json BookCoverOption setting
	*/
	Json SmsImportSchool::GetBookCoverOption(
		pt::ptree &settings, manager::SmsAlbumDatabase &album_db,
		manager::SmsAlbumItemDatabase &item_db) const {
		SmsDebugLog("Call GetBookCoverOption");
		Json::object j_book_cover_option;
		SmsDebugLog("Get frontImagePosition");
		if (auto optional = settings.get_optional<int>("frontImagePosition")) {
			auto front_position = optional.get();
			j_book_cover_option["frontImagePosition"] = front_position;
			auto &front_image_path =
				GetAlbumItemPath(front_position, album_db, item_db);
			j_book_cover_option["frontImagePath"] = front_image_path;
		}
		SmsDebugLog("Get reducedImagePosition");
		if (auto optional = settings.get_optional<int>("reducedImagePosition")) {
			auto reduced_position = optional.get();
			j_book_cover_option["reducedImagePosition"] = reduced_position;
			auto &reduced_image_path =
				GetAlbumItemPath(reduced_position, album_db, item_db);
			j_book_cover_option["reducedImagePath"] = reduced_image_path;
		}
		SmsDebugLog("Get font setting");
		if (auto &opt_font = settings.get_optional<string>("font.fontBinary")) {
			auto &font_binary = opt_font.get();
			auto win_font = LogFont(font_binary);
			string font_color;
			if (auto &opt_font_color = settings.get_optional<string>("font.fontColor")) {
				font_color = opt_font_color.get();
			}
			j_book_cover_option["font"] = CreateFont(win_font, font_color);
		}

		SmsDebugLog("Get other setting");
		if (auto optional = settings.get_optional<int>("bookCoverColorType")) {
			j_book_cover_option["bookCoverColorType"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("displayNameAndImage")) {
			j_book_cover_option["displayNameAndImage"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("displayPasswordKeyMark")) {
			j_book_cover_option["displayPasswordKeyMark"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("horizontalName")) {
			j_book_cover_option["horizontalName"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("photoInformationIcon")) {
			j_book_cover_option["photoInformationIcon"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("reducedImage")) {
			j_book_cover_option["reducedImage"] = optional.get();
		}
		if (auto optional = settings.get_optional<int>("thicknessByPage")) {
			j_book_cover_option["thicknessByPage"] = optional.get();
		}
		SmsDebugLog("return bookCoverOption setting");
		return Json(j_book_cover_option);
	}


	/**
	* @fn
	* GetAlbumItemPath
	* @brief get path of AlbumItem
	* @param display_number position of AlbumItem
	* @param album_db is SmsAlbumDatabase
	* @param album_item_db is SmsAlbumItemDatabase
	* @return path of AlbumItem
	*/
	string SmsImportSchool::GetAlbumItemPath(
		const int display_number, manager::SmsAlbumDatabase &album_db,
		manager::SmsAlbumItemDatabase &album_item_db) const {
		int position = display_number;
		if (display_number == 0) {
			position = 1;
		}
		auto &frame = album_db.GetAlbumFrameByPosition(position);
		auto &photo_frame = frame.GetPhotoFrames();
		if (photo_frame.size() == 0) {
			return "";
		}
		auto album_item_id = photo_frame.at(0).GetAlbumItemId();
		auto &album_item = album_item_db.GetAlbumItem(album_item_id);

		wstring parent = album_item_db.GetParentFolderDb();
		auto &path =
			SmsAppUtil::Utf16ToUtf8(parent + L"\\albumItems\\" +
				album_item.GetParentFolder()) +
			"\\" + album_item.GetFileName();

		return path;
	}


	/**
	* @fn
	* GetImageFileTotalCount
	* @brief count albumItemId in photoFrame
	* @param db is a SmsAlbumDatabase
	* @return number for ImageFile
	*/
	int SmsImportSchool::GetImageFileTotalCount(
		manager::SmsAlbumDatabase &db) const {

		try {
			return db.GetPhotoFrameTotalCount(string("WHERE albumItemId > 0"));
		}
		catch (SmsDatabaseException &ex) {
			SmsErrorLog(ex.What());
			throw SmsException("Get ImageFileTotalCount fail");
		}
	}


	/**
	* @fn
	* GetImageFileTotalCount
	* @brief count albumFrameId in albumFrame
	* @param db is a SmsAlbumDatabase
	* @return number for Frame
	*/
	int SmsImportSchool::GetFrameTotalCount(
		manager::SmsAlbumDatabase &db) const {
		try {
			SmsStatement statement(db.GetAlbumDB(),
				u8"SELECT count(albumFrameId) FROM albumFrame "
				u8"WHERE albumFrameId > 0; ");
			auto count = 0;
			if (statement.ExecuteStep()) {
				count = statement.GetColumn(0).GetInt();
				statement.Reset();
			}
			return count;
		}
		catch (SmsDatabaseException &ex) {
			SmsErrorLog(ex.What());
			throw SmsException("Get FrameTotalCount fail");
		}
	}

}  // namespace sms_accessor

