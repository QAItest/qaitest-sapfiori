@TEST-102 @auth @sap-fiori @env_ui
Feature: SAP Fiori authentication
  As an authorized SAP user
  I want to log in and log out of the Fiori Launchpad
  So that authenticated test journeys start and finish with a controlled session

  Scenario: A user logs in and logs out
    Given valid SAP credentials are available securely
    When I log in to the SAP Fiori application
    Then the authenticated application should be displayed
    When I log out of the SAP Fiori application
    Then the anonymous or login page should be displayed
