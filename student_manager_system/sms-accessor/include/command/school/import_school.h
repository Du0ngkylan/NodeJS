/**
 * @file import_construction.h
 * @brief import construction command header
 * @author Nguyen Toan
 * @date 2018/11/12
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_IMPORT_CONSTRUCTION_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_IMPORT_CONSTRUCTION_H_

#include "../../accessor_command.h"
#include "goyo_db_if.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoImportConstruction
 * @brief get photo info tree command
 */
class GoyoImportConstruction : public GoyoAccessorCommand {
 public:
	void CreateBoockrackItemTree(std::vector<GoyoBookrackItem>& bookrack_items,
	                             goyo_db_manager::manager::GoyoBookrackDatabase& src_bookrack_db);
  /**
   * @fn
   * GoyoImportConstruction
   * @brief constructor
   */
  GoyoImportConstruction();

  /**
   * @fn
   * ~GoyoImportConstruction
   * @brief destructor
   */
  ~GoyoImportConstruction();

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
	                    goyo_db_manager::manager::GoyoAlbumDatabase& album_db,
	                    goyo_db_manager::manager::GoyoAlbumItemDatabase& album_item_db);
	void GetConstructionInfo(GoyoConstructionInfo& info, const json11::Json& construction);
	int CreateFileKouji(GoyoConstructionInfo& info, const json11::Json& construction);
	void UpdateDataKoujiXml(const json11::Json& construction, boost::property_tree::wptree& dst);
	void UpdateWaterRouteInformations(const json11::Json& construction, boost::property_tree::wptree& dst);
	
	void CreateAlbum(const json11::Json& j_album, int& album_id, goyo_db_manager::manager::GoyoAlbumDatabase& album_db);
	// Get information construction 
	void GetContractee(const json11::Json& j_contractee, GoyoContracteeInfo& contractee_info);
	void GetContractor(const json11::Json& contractor_json, GoyoContractorInfo& contractor_info);
	void CopyAlbumTemplate(fs::wpath& template_folder, fs::wpath& template_folder_org);
	void CopyCoverFiles(std::vector<boost::filesystem::path>& src_covers, fs::wpath& album_dir);
	void GetAlbumSetting(GoyoAlbum& album, const json11::Json& settings) const;
	void SetAlbum(GoyoAlbum& album, const json11::Json& j_album, goyo_db_manager::RecordStatus status) const;
	//void SetBookrackItem(GoyoBookrackItem& item, const json11::Json& j_album) const;
	void SetAlbumSetting(GoyoAlbumSettings& settings, const json11::Json& j_settings) const;
	json11::Json GetAlbumDetail(int album_id, goyo_db_manager::manager::GoyoAlbumDatabase& album_db,
	                            GoyoBookrackItem& bookrack_item,
	                            goyo_db_manager::manager::GoyoAlbumItemDatabase& album_item_db);
	void GetSettingsTree(GoyoAlbumSettings& settings, boost::property_tree::ptree& root) const;
	json11::Json GetDataAlbumSettings(boost::property_tree::ptree& settings) const;
	json11::Json GetBookCoverOption(boost::property_tree::ptree& settings,
	                                goyo_db_manager::manager::GoyoAlbumDatabase& album_db,
	                                goyo_db_manager::manager::GoyoAlbumItemDatabase& item_db) const;
	std::string GetAlbumItemPath(int display_number, goyo_db_manager::manager::GoyoAlbumDatabase& album_db,
	                             goyo_db_manager::manager::GoyoAlbumItemDatabase& album_item_db) const;
	int GetImageFileTotalCount(goyo_db_manager::manager::GoyoAlbumDatabase& db) const;
	int GetFrameTotalCount(goyo_db_manager::manager::GoyoAlbumDatabase& db) const;


	std::map<std::wstring, std::string> m_key_string;
	std::map<std::wstring, std::string> m_key_number;
	std::map<std::wstring, std::string> m_key_contractee;
	std::map<std::wstring, std::string> m_key_contractor;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_IMPORT_CONSTRUCTION_H_
