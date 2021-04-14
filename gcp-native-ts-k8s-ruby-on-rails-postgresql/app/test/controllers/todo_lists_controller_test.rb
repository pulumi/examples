require 'test_helper'

class TodoListsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @todo_list = todo_lists(:one)
  end

  test "should get index" do
    get todo_lists_url
    assert_response :success
  end

  test "should get new" do
    get new_todo_list_url
    assert_response :success
  end

  test "should create todo_list" do
    assert_difference('TodoList.count') do
      post todo_lists_url, params: { todo_list: { description: @todo_list.description, title: @todo_list.title } }
    end

    assert_redirected_to todo_list_url(TodoList.last)
  end

  test "should show todo_list" do
    get todo_list_url(@todo_list)
    assert_response :success
  end

  test "should get edit" do
    get edit_todo_list_url(@todo_list)
    assert_response :success
  end

  test "should update todo_list" do
    patch todo_list_url(@todo_list), params: { todo_list: { description: @todo_list.description, title: @todo_list.title } }
    assert_redirected_to todo_list_url(@todo_list)
  end

  test "should destroy todo_list" do
    assert_difference('TodoList.count', -1) do
      delete todo_list_url(@todo_list)
    end

    assert_redirected_to todo_lists_url
  end
end
