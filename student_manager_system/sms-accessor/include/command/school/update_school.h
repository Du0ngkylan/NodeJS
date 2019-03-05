/**
 * @file update_school.h
 * @brief update school order command header
 * @author DuongMX
 * @date 2018/11/30
 */

#ifndef SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_
#define SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_

#include "../../accessor_command.h"
#include "sms_db_if.h"

namespace sms_accessor {

/**
 * @class SmsUpdateSchool
 * @brief update construction order command
 */
class SmsUpdateSchool : public SmsAccessorCommand {
 public:
  /**
   * @fn
   * SmsUpdateSchool
   * @brief constructor
   */
  SmsUpdateSchool();

  /**
   * @fn
   * ~SmsUpdateSchool
   * @brief destructor
   */
  ~SmsUpdateSchool();

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
	 int SmsUpdateSchool::CreateFileKouji(
      Sms_db_manager::model::SmsConstructionInfo &info,
      const json11::Json &construction);

  /**
   * @fn
   * GetConstructionInfo
   * @brief Get info of construction form json
   * @param info model of construction
   * @param construction json data input
   */
	 void GetConstructionInfo(Sms_db_manager::model::SmsConstructionInfo &info,
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

}  // namespace sms_accessor

#endif  // SMS_ACCESSOR_INCLUDE_COMMAND_SCHOOL_UPDATE_SCHOOL_H_