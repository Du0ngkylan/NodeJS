/**
 * @file update_construction.h
 * @brief update construction order command header
 * @author Nguyen Toan
 * @date 2018/07/26
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_H_

#include <goyo_db/model/goyo_construction_info.h>
#include "../../accessor_command.h"
#include <goyo_db/manager/goyo_master_database.h>

namespace goyo_bookrack_accessor {

/**
 * @class GoyoUpdateConstruction
 * @brief update construction order command
 */
class GoyoUpdateConstruction : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoUpdateConstruction
   * @brief constructor
   */
  GoyoUpdateConstruction();

  /**
   * @fn
   * ~GoyoUpdateConstruction
   * @brief destructor
   */
  ~GoyoUpdateConstruction();

	/**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param request request json
   * @param raw raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

 private:
  /**
   * @fn
   * CreateFileKouji
   * @brief Create new File kouji.XML
   * @param info model of construction
   * @param construction json data input
   */
	 int GoyoUpdateConstruction::CreateFileKouji(
      goyo_db_manager::model::GoyoConstructionInfo &info,
      const json11::Json &construction);

  /**
   * @fn
   * GetConstructionInfo
   * @brief Get info of construction form json
   * @param info model of construction
   * @param construction json data input
   */
	 void GetConstructionInfo(goyo_db_manager::model::GoyoConstructionInfo &info,
                           const json11::Json &construction);

  /**
   * @fn
   * UpdateDataKoujiXml
   * @brief Update content file kouji.XML
   * @param construction json data input
   * @param dst data for file kouji.XML after update
   */
	 void UpdateDataKoujiXml(const json11::Json &construction,
                          boost::property_tree::wptree &dst);

  /**
   * @fn
   * UpdateDataKoujiXml
   * @brief Update part WaterRouteInformations of kouji.XML
   * @param construction json data input
   * @param dst data for file kouji.XML after update
   */
  void UpdateWaterRouteInformations(const json11::Json &construction,
                                    boost::property_tree::wptree &dst);

  std::wstring m_data_dir;
  std::map<std::wstring, std::string> m_key_string;
  std::map<std::wstring, std::string> m_key_number;
  std::map<std::wstring, std::string> m_key_contractee;
  std::map<std::wstring, std::string> m_key_contractor;
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_UPDATE_CONSTRUCTION_H_