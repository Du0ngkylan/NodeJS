/**
 * @file get_construction_detail.h
 * @brief get construction detail command header
 * @author duong.maixuan
 * @date 2018/07/18
 */

#ifndef GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTION_DETAIL_H_
#define GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTION_DETAIL_H_

#include "../../accessor_command.h"
#include "goyo_db_if.h"

namespace goyo_bookrack_accessor {

/**
 * @class GoyoGetConstructionDetail
 * @brief get constructions detail command
 */
class GoyoGetConstructionDetail : public GoyoAccessorCommand {
 public:
  /**
   * @fn
   * GoyoGetConstructionDetail
   * @brief constructor
   */
  GoyoGetConstructionDetail();

  /**
   * @fn
   * ~GoyoGetConstructionDetail
   * @brief destructor
   */
  ~GoyoGetConstructionDetail();

  /**
   * @fn
   * ExecuteCommand
   * @brief execute command
   * @param (request) request json 
   * @param (raw) raw string
   */
  json11::Json ExecuteCommand(json11::Json &request, std::string &raw);

  /**
   * @fn
   * CreateConstruction
   * @param (info) construction info
   * @param (db) construction database
   * @param (get_folder_size) get folder size flag
   * @brief create construction detail
   * @return construction object
   */
  static json11::Json CreateConstruction(
      goyo_db_manager::model::GoyoConstructionInfo &info,
      goyo_db_manager::manager::GoyoMasterDatabase &db,
      bool get_folder_size);

 private:

  /**
   * @fn
   * CreateKnack
   * @param (knack_info) knack info
   * @param (db) construction database
   * @brief create knack
   * @return nack object
   */
	static json11::Json CreateKnack(
      goyo_db_manager::model::GoyoKnackInfo &knack_info,
      goyo_db_manager::manager::GoyoMasterDatabase &db);

  /**
   * @fn
   * CreateAddresses
   * @param (construction_info) construction property
   * @brief create address array
   * @return address array
   */
	static json11::Json::array CreateAddresses(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreateBusinessCode
   * @param (construction_info) construction property
   * @brief create business_code array
   * @return business_code array
   */
	static json11::Json::array CreateBusinessCode(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreateBusinessKeyword
   * @param (construction_info) construction property
   * @brief create business_keywords array
   * @return business_keywords array
   */
	static json11::Json::array CreateBusinessKeyword(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreatePhotoInformationTag
   * @param (construction_info) construction property
   * @brief create photo_information_tags array
   * @return photo_information_tags array
   */
	static json11::Json::array CreatePhotoInformationTag(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreateFacilityNames
   * @param (construction_info) construction property
   * @brief create facility_names array
   * @return facility_names array
   */
	static json11::Json::array CreateFacilityNames(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreateConstructionMethodForms
   * @param (construction_info) construction property
   * @brief create construction method form array
   * @return construction method form array
   */
	static json11::Json::array CreateConstructionMethodForms(
      boost::property_tree::wptree construction_info);

  /**
   * @fn
   * CreateWaterRouteInformations
   * @param (construction_info) construction property
   * @brief create water route information array
   * @return water route information array
   */
	static json11::Json::array CreateWaterRouteInformations(
      boost::property_tree::wptree construction_info);
};

}  // namespace goyo_bookrack_accessor

#endif  // GOYO_BOOKRACK_ACCESSOR_INCLUDE_COMMAND_CONSTRUCTION_GET_CONSTRUCTION_DETAIL_H_
