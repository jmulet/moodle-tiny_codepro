@editor  @tiny @editor_tiny  @tiny_codepro
Feature: Tiny code pro editor
  Open the code pro editor
  Background:
    Given the following "courses" exist:
        | shortname | fullname |
        | C1        | Course 1 |
    And the following "users" exist:
        | username | firstname | lastname | email                |
        | teacher1 | Teacher   | 1        | teacher1@example.com |
    And the following "course enrolments" exist:
        | user     | course | role           |
        | teacher1 | C1     | editingteacher |
    And the following "activities" exist:
        | activity | name      | intro     | introformat | course | contentformat | idnumber |
        | page     | PageName1 | PageDesc1 | 1           | C1     | 1             | 1        |
  @javascript @external
  Scenario: View HTML in TinyMCE source code view
    Given I log in as "admin"
    When I open my profile in edit mode
    And I set the field "Description" to "Hello tiny!"
    And I click on the "View > Source code Pro" menu item for the "Description" TinyMCE editor
    Then I should see "Source code Pro"
