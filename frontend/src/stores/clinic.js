import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

const api = axios.create({ withCredentials: true })

function makeCrud(path) {
  return {
    async load()            { return (await api.get(path)).data },
    async create(data)      { return (await api.post(path, data)).data },
    async update(id, data)  { return (await api.put(`${path}/${id}`, data)).data },
    async remove(id)        { return (await api.delete(`${path}/${id}`)).data },
  }
}

export const useClinicStore = defineStore('clinic', () => {
  const clinic      = ref(null)
  const fixedCosts  = ref([])
  const salaries    = ref([])
  const equipment   = ref([])
  const capacity    = ref(null)
  const consumables = ref([])
  const materials   = ref([])
  const categories  = ref([])

  const crud = {
    fixedCosts:  makeCrud('/api/fixed-costs'),
    salaries:    makeCrud('/api/salaries'),
    equipment:   makeCrud('/api/equipment'),
    consumables: makeCrud('/api/consumables'),
    materials:   makeCrud('/api/materials'),
    categories:  makeCrud('/api/categories'),
  }

  async function loadAll() {
    const [fc, sal, eq, cap, con, mat, cat, cl] = await Promise.allSettled([
      crud.fixedCosts.load(),
      crud.salaries.load(),
      crud.equipment.load(),
      api.get('/api/capacity').then(r => r.data),
      crud.consumables.load(),
      crud.materials.load(),
      crud.categories.load(),
      api.get('/api/clinic').then(r => r.data),
    ])
    if (fc.status === 'fulfilled')  fixedCosts.value  = fc.value
    if (sal.status === 'fulfilled') salaries.value    = sal.value
    if (eq.status === 'fulfilled')  equipment.value   = eq.value
    if (cap.status === 'fulfilled') capacity.value    = cap.value
    if (con.status === 'fulfilled') consumables.value = con.value
    if (mat.status === 'fulfilled') materials.value   = mat.value
    if (cat.status === 'fulfilled') categories.value  = cat.value
    if (cl.status === 'fulfilled')  clinic.value      = cl.value
  }

  async function updateCapacity(data) {
    const res = await api.put('/api/capacity', data)
    capacity.value = res.data
  }

  async function updateClinic(data) {
    const res = await api.put('/api/clinic', data)
    clinic.value = res.data
  }

  function mergeById(list, id, patch) {
    const i = list.findIndex(x => x.id === id)
    if (i >= 0) list[i] = { ...list[i], ...patch }
  }

  // Fixed costs
  async function loadFixedCosts()            { fixedCosts.value  = await crud.fixedCosts.load() }
  async function createFixedCost(data)       { fixedCosts.value.push(await crud.fixedCosts.create(data)) }
  async function updateFixedCost(id, data)   { await crud.fixedCosts.update(id, data); mergeById(fixedCosts.value, id, data) }
  async function deleteFixedCost(id)         { await crud.fixedCosts.remove(id); fixedCosts.value = fixedCosts.value.filter(x => x.id !== id) }

  // Salaries
  async function loadSalaries()              { salaries.value    = await crud.salaries.load() }
  async function createSalary(data)          { salaries.value.push(await crud.salaries.create(data)) }
  async function updateSalary(id, data)      { await crud.salaries.update(id, data); mergeById(salaries.value, id, data) }
  async function deleteSalary(id)            { await crud.salaries.remove(id); salaries.value = salaries.value.filter(x => x.id !== id) }

  // Equipment
  async function loadEquipment()             { equipment.value   = await crud.equipment.load() }
  async function createEquipment(data)       { equipment.value.push(await crud.equipment.create(data)) }
  async function updateEquipment(id, data)   { await crud.equipment.update(id, data); mergeById(equipment.value, id, data) }
  async function deleteEquipment(id)         { await crud.equipment.remove(id); equipment.value = equipment.value.filter(x => x.id !== id) }

  // Consumables
  async function loadConsumables()           { consumables.value = await crud.consumables.load() }
  async function createConsumable(data)      { consumables.value.push(await crud.consumables.create(data)) }
  async function updateConsumable(id, data)  { await crud.consumables.update(id, data); mergeById(consumables.value, id, data) }
  async function deleteConsumable(id)        { await crud.consumables.remove(id); consumables.value = consumables.value.filter(x => x.id !== id) }

  // Materials
  async function loadMaterials()             { materials.value   = await crud.materials.load() }
  async function createMaterial(data)        { materials.value.push(await crud.materials.create(data)) }
  async function updateMaterial(id, data)    { await crud.materials.update(id, data); mergeById(materials.value, id, data) }
  async function deleteMaterial(id)          { await crud.materials.remove(id); materials.value = materials.value.filter(x => x.id !== id) }

  return {
    clinic, fixedCosts, salaries, equipment, capacity, consumables, materials, categories,
    loadAll, updateCapacity, updateClinic,
    loadFixedCosts, createFixedCost, updateFixedCost, deleteFixedCost,
    loadSalaries, createSalary, updateSalary, deleteSalary,
    loadEquipment, createEquipment, updateEquipment, deleteEquipment,
    loadConsumables, createConsumable, updateConsumable, deleteConsumable,
    loadMaterials, createMaterial, updateMaterial, deleteMaterial,
  }
})
