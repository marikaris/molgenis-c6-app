import Vue from 'vue'
import Vuex from 'vuex'
import api from '@molgenis/molgenis-api-client'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    phenotypes: [],
    array: [],
    overlap: 0,
    patients: []
  },
  mutations: {
    setPatients (state, items) {
      state.patients = items
    },
    setPhenotypes (state, attrs) {
      const phenotypes = attrs.filter((attr) => {
        if (attr.fieldType === 'CATEGORICAL' && attr.name !== 'sex' && attr.refEntity.label === 'bool_options') {
          return true
        } else {
          return false
        }
      }).map((phenotypeAttr) => {
        return { value: phenotypeAttr.name, text: phenotypeAttr.label }
      })
      state.phenotypes = phenotypes
    },
    setArrayData (state, items) {
      state.array = items
    }
  },
  getters: {
    getPhenotypes: (state) => state.phenotypes
  },
  actions: {
    getPhenotypeOptions ({ commit }) {
      return api.get('api/v2/c6_research_patients').then((response) => {
        commit('setPhenotypes', response.meta.attributes)
      })
    },
    getPatients ({ commit }) {
      return api.get('api/v2/c6_research_patients?num=10000').then((response) => {
        commit('setPatients', response.items)
      })
    },
    getArrayData ({ commit }) {
      return api.get('api/v2/c6_array?num=10000').then((response) => {
        commit('setArrayData', response.items)
      })
    }
  }
})
