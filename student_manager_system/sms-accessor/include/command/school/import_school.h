/**
 * @file import_school.h
 * @brief import school command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsImportSchool
 * @brief get photo info tree command
 */
class SmsImportSchool : public SmsAccessorCommand {
 public:
	void CreateBoockrackItemTree(std::vector<SmsBookrackItem>& bookrack_items,
	                             Sms_db_manager::manager::SmsBookrackDatabase& src_bookrack_db);
  /**
   * @fn
   * SmsImportSchool
   * @brief constructor
   */
  SmsImportSchool();

  /**
   * @fn
   * ~SmsImportSchool
   * @brief destructor
   */
  ~SmsImportSchool();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   * @return result json
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

private:
	std::wstring CopyReferenceDiagramFile(const json11::Json& j_ref_diagram_file, std::wstring& album_dir);
	void AddAlbumFrames(std::vector<json11::Json>& album_frames_json,
	                    Sms_db_manager::manager::SmsAlbumDatabase& album_db,
	                    Sms_db_manager::manager::SmsAlbumItemDatabase& album_item_db);
	void GetConstructionInfo(SmsConstructionInfo& info, const json11::Json& construction);
	int CreateFileKouji(SmsConstructionInfo& info, const json11::Json& construction);
	void UpdateDataKoujiXml(const json11::Json& construction, boost::property_tree::wptree& dst);
	void UpdateWaterRouteInformations(const json11::Json& construction, boost::property_tree::wptree& dst);
	
	void CreateAlbum(const json11::Json& j_album, int& album_id, Sms_db_manager::manager::SmsAlbumDatabase& album_db);
	// Get information construction 
	void GetContractee(const json11::Json& j_contractee, SmsContracteeInfo& contractee_info);
	void GetContractor(const json11::Json& contractor_json, SmsContractorInfo& contractor_info);
	void CopyAlbumTemplate(fs::wpath& template_folder, fs::wpath& template_folder_org);
	void CopyCoverFiles(std::vector<boost::filesystem::path>& src_covers, fs::wpath& album_dir);
	void GetAlbumSetting(SmsAlbum& album, const json11::Json& settings) const;
	void SetAlbum(SmsAlbum& album, const json11::Json& j_album, Sms_db_manager::RecordStatus status) const;
	//void SetBookrackItem(SmsBookrackItem& item, const json11::Json& j_album) const;
	void SetAlbumSetting(SmsAlbumSettings& settings, const json11::Json& j_settings) const;
	json11::Json GetAlbumDetail(int album_id, Sms_db_manager::manager::SmsAlbumDatabase& album_db,
	                            SmsBookrackItem& bookrack_item,
	                            Sms_db_manager::manager::SmsAlbumItemDatabase& album_item_db);
	void GetSettingsTree(SmsAlbumSettings& settings, boost::property_tree::ptree& root) const;
	json11::Json GetDataAlbumSettings(boost::property_tree::ptree& settings) const;
	json11::Json GetBookCoverOption(boost::property_tree::ptree& settings,
	                                Sms_db_manager::manager::SmsAlbumDatabase& album_db,
	                                Sms_db_manager::manager::SmsAlbumItemDatabase& item_db) const;
	std::string GetAlbumItemPath(int display_number, Sms_db_manager::manager::SmsAlbumDatabase& album_db,
	                             Sms_db_manager::manager::SmsAlbumItemDatabase& album_item_db) const;
	int GetImageFileTotalCount(Sms_db_manager::manager::SmsAlbumDatabase& db) const;
	int GetFrameTotalCount(Sms_db_manager::manager::SmsAlbumDatabase& db) const;


	std::map<std::wstring, std::string> m_key_string;
	std::map<std::wstring, std::string> m_key_number;
	std::map<std::wstring, std::string> m_key_contractee;
	std::map<std::wstring, std::string> m_key_contractor;
};

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_IMPORT_SCHOOL_H_
